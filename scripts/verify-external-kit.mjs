import { execFileSync, spawn } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

import { readJson, repositoryRoot } from "./workspace-graph.mjs";

const kitWorkspaces = [
  "@interactive-os/json-document",
  "@interactive-os/json-document-selection",
  "@interactive-os/json-document-editing",
  "@interactive-os/json-document-web",
  "@interactive-os/json-document-react",
  "@interactive-os/json-document-zod",
  "@interactive-os/json-document-database",
];
const fixtureSource = join(repositoryRoot, "fixtures", "external-kit");
const temporaryRoot = await mkdtemp(join(tmpdir(), "json-document-external-kit-"));
const tarballRoot = join(temporaryRoot, "tarballs");
const fixtureRoot = join(temporaryRoot, "consumer");
const npmCache = join(temporaryRoot, ".npm-cache");
const keep = process.env.EXTERNAL_KIT_KEEP === "1";

function run(command, args, cwd = repositoryRoot) {
  try {
    return execFileSync(command, args, {
      cwd,
      env: { ...process.env, npm_config_cache: npmCache },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stdout = String(error.stdout ?? "").trim();
    const stderr = String(error.stderr ?? "").trim();
    throw new Error([
      `Command failed: ${command} ${args.join(" ")}`,
      `cwd: ${cwd}`,
      stdout && `stdout:\n${stdout}`,
      stderr && `stderr:\n${stderr}`,
    ].filter(Boolean).join("\n\n"), { cause: error });
  }
}

async function packKit() {
  for (const workspace of kitWorkspaces) {
    run("npm", ["run", "build", "--workspace", workspace]);
  }
  await mkdir(tarballRoot);
  const tarballs = new Map();
  for (const workspace of kitWorkspaces) {
    const packed = JSON.parse(run("npm", [
      "pack",
      "--workspace", workspace,
      "--json",
      "--pack-destination", tarballRoot,
    ]))[0];
    tarballs.set(workspace, join(tarballRoot, basename(packed.filename)));
  }
  return tarballs;
}

async function installFixture(tarballs) {
  await cp(fixtureSource, fixtureRoot, { recursive: true });
  const site = readJson("site/package.json");
  const dependencies = {
    react: site.dependencies.react,
    "react-dom": site.dependencies["react-dom"],
    zod: site.dependencies.zod,
  };
  for (const [workspace, tarball] of tarballs) dependencies[workspace] = pathToFileURL(tarball).href;
  await writeFile(join(fixtureRoot, "package.json"), JSON.stringify({
    name: "json-document-external-consumer",
    private: true,
    type: "module",
    scripts: { typecheck: "tsc --noEmit", build: "vite build" },
    dependencies,
    devDependencies: {
      "@types/react": site.devDependencies["@types/react"],
      "@types/react-dom": site.devDependencies["@types/react-dom"],
      typescript: site.devDependencies.typescript,
      vite: site.devDependencies.vite,
    },
  }, null, 2));

  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], fixtureRoot);
  run("npm", ["ls", "--all"], fixtureRoot);
  const lock = await readFile(join(fixtureRoot, "package-lock.json"), "utf8");
  if (lock.includes("workspace:") || lock.includes(repositoryRoot)) {
    throw new Error("External fixture lockfile leaked a workspace or repository path");
  }
  const source = await readFile(join(fixtureRoot, "src", "main.tsx"), "utf8");
  if (source.includes("packages/") || source.includes("site/") || source.includes("workspace:")) {
    throw new Error("External fixture source imported a repository-owned path");
  }
  const publicImports = [...source.matchAll(/from\s+["'](@interactive-os\/[^"']+)["']/g)].map((match) => match[1]);
  if (publicImports.some((name) => name !== "@interactive-os/json-document-database")) {
    throw new Error(`External admin leaked internal package imports: ${publicImports.join(", ")}`);
  }
  for (const workspace of kitWorkspaces) {
    const packagePath = join(fixtureRoot, "node_modules", ...workspace.split("/"), "package.json");
    const installed = JSON.parse(await readFile(packagePath, "utf8"));
    if (installed.name !== workspace) throw new Error(`Installed package identity drifted: ${workspace}`);
  }
  run("npm", ["run", "typecheck"], fixtureRoot);
  run("npm", ["run", "build"], fixtureRoot);
}

async function verifyBrowser() {
  const port = await availablePort();
  const viteEntry = join(fixtureRoot, "node_modules", "vite", "bin", "vite.js");
  const server = spawn(process.execPath, [viteEntry, "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: fixtureRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  server.stdout.on("data", (chunk) => { serverOutput += chunk; });
  server.stderr.on("data", (chunk) => { serverOutput += chunk; });
  try {
    await waitForURL(`http://127.0.0.1:${port}`);
    const channel = process.env.PLAYWRIGHT_CHANNEL === "bundled"
      ? undefined
      : process.env.PLAYWRIGHT_CHANNEL ?? "chrome";
    const browser = await chromium.launch(channel === undefined ? {} : { channel });
    try {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.goto(`http://127.0.0.1:${port}`);
      await page.getByRole("heading", { name: "Delivery database" }).waitFor();
      await page.getByText("240 records loaded").waitFor();
      if (await page.getByTestId("custom-status").count() !== 50) throw new Error("Host status renderer or server pagination was not used");
      const database = page.locator(".company-database");
      const accent = await database.evaluate((node) => getComputedStyle(node).getPropertyValue("--jd-db-accent").trim());
      if (accent !== "#6750d8") throw new Error("Host theme token was not applied");

      const title = page.getByRole("textbox", { name: "Title task-1", exact: true });
      await title.fill("Triage enterprise feedback");
      await title.press("Enter");
      await page.getByText("Changes saved").waitFor();

      await page.getByRole("combobox", { name: "Status task-1", exact: true }).selectOption("done");
      await page.getByText("Changes saved").waitFor();

      await page.getByRole("button", { name: "Next save: network failure" }).click();
      const owner = page.getByRole("textbox", { name: "Owner task-1", exact: true });
      await owner.fill("Network rollback");
      await owner.press("Enter");
      await page.getByText("Connection lost. Local change was rolled back.").waitFor();
      if (await page.getByRole("textbox", { name: "Owner task-1", exact: true }).inputValue() !== "Ada") throw new Error("Optimistic rollback did not restore the row");

      const search = page.getByRole("searchbox", { name: "Search records" });
      await search.fill("Archive legacy exports");
      await page.getByText("60 records loaded").waitFor();
      await search.fill("");
      await page.getByText("240 records loaded").waitFor();

      await page.getByRole("combobox", { name: "Active view" }).selectOption("triage");
      await page.getByText("159 records loaded").waitFor();
      await page.getByRole("button", { name: "Save view" }).click();
      await page.getByText("1 views saved").waitFor();

      await page.getByText("Columns", { exact: true }).click();
      await page.getByRole("checkbox", { name: "owner" }).uncheck();
      await page.getByRole("columnheader").filter({ hasText: "Owner" }).waitFor({ state: "detached" });

      await page.getByRole("button", { name: "New record" }).click();
      const recordDialog = page.getByRole("dialog");
      await recordDialog.getByRole("textbox").nth(0).fill("Enterprise acceptance record");
      await recordDialog.getByRole("textbox").nth(1).fill("Grace");
      await recordDialog.getByRole("button", { name: "Save record" }).click();
      await page.getByText("Record created").waitFor();

      await page.getByRole("button", { name: "Load more" }).click();
      await page.waitForFunction(() => document.querySelectorAll("tbody tr").length === 100);

      await page.getByRole("button", { name: "Next save: conflict" }).click();
      await page.getByRole("combobox", { name: "Status task-2", exact: true }).selectOption("done");
      await page.getByText("This record changed on the server. Refresh before retrying.").waitFor();
      if (await page.getByRole("combobox", { name: "Status task-2", exact: true }).inputValue() !== "progress") throw new Error("Conflict rollback did not restore the row");

      await page.getByRole("gridcell", { name: "Polish billing settings", exact: true }).dblclick();
      const detail = page.getByRole("dialog");
      await detail.getByRole("textbox").nth(0).fill("");
      await detail.getByRole("button", { name: "Save record" }).click();
      await detail.getByText("Enter a title").waitFor();
      await detail.getByRole("button", { name: "Close record" }).click();

      const firstCell = page.locator('td[data-record-id="task-2"][data-property-id="title"]');
      await firstCell.click();
      await firstCell.press("ArrowRight");
      const focusedProperty = await page.locator("td:focus").getAttribute("data-property-id");
      if (focusedProperty !== "points") throw new Error(`Keyboard focus did not follow projected order: ${focusedProperty}`);

      await firstCell.click();
      await page.locator('td[data-record-id="task-4"][data-property-id="title"]').click({ modifiers: ["Shift"] });
      await page.getByRole("button", { name: "Delete selected (2)", exact: true }).waitFor();
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "Delete selected (2)", exact: true }).click();
      await page.getByText("1 of 2 records could not be deleted").waitFor();
      if (pageErrors.length > 0) throw new Error(`Browser errors: ${pageErrors.join(" | ")}`);
    } finally {
      await browser.close();
    }
  } catch (error) {
    throw new Error(`External browser verification failed\n${serverOutput}`, { cause: error });
  } finally {
    await stopServer(server);
  }
}

async function stopServer(server) {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  const closed = new Promise((resolve) => server.once("close", resolve));
  const timedOut = await Promise.race([
    closed.then(() => false),
    new Promise((resolve) => setTimeout(() => resolve(true), 5_000)),
  ]);
  if (!timedOut) return;
  server.kill("SIGKILL");
  await closed;
}

async function expectAttribute(locator, name, value) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await locator.getAttribute(name) === value) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Expected ${name}=${value}`);
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.listen(0, "127.0.0.1", resolve).once("error", reject));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Unable to allocate a browser port");
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function waitForURL(url) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

try {
  const tarballs = await packKit();
  await installFixture(tarballs);
  await verifyBrowser();
  console.log(`external Database Hand ok: ${kitWorkspaces.length} tarballs, one package import, typecheck, build, admin browser`);
} finally {
  if (keep) console.log(`external fixture retained at ${temporaryRoot}`);
  else await rm(temporaryRoot, { recursive: true, force: true });
}
