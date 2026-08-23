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
  const server = spawn("npm", ["exec", "vite", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
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
      await page.goto(`http://127.0.0.1:${port}`);
      const editor = page.getByTestId("external-editor");
      await expectAttribute(editor, "data-selection-contract", "range");

      await page.locator('[data-block-id="beta"]').click();
      await expectAttribute(page.locator('[data-block-id="beta"]'), "data-selected", "true");

      await editor.focus();
      await page.keyboard.press("ArrowUp");
      await expectAttribute(page.locator('[data-block-id="alpha"]'), "data-selected", "true");

      await page.getByRole("textbox", { name: "alpha text" }).fill("Alpha edited");
      await page.getByText("undo-ready").waitFor();

      await editor.evaluate((node) => {
        const data = new DataTransfer();
        node.dispatchEvent(new ClipboardEvent("copy", { bubbles: true, cancelable: true, clipboardData: data }));
        node.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
      });
      await page.locator("[data-block-id]").nth(2).waitFor();
      if (await page.locator("[data-block-id]").count() !== 3) throw new Error("Clipboard paste did not add a block");

      await editor.focus();
      await page.keyboard.press("ControlOrMeta+z");
      await page.locator("[data-block-id]").nth(2).waitFor({ state: "detached" });
      if (await page.locator("[data-block-id]").count() !== 2) throw new Error("History undo did not restore the document");
    } finally {
      await browser.close();
    }
  } catch (error) {
    throw new Error(`External browser verification failed\n${serverOutput}`, { cause: error });
  } finally {
    server.kill("SIGTERM");
  }
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
  console.log(`external npm kit ok: ${kitWorkspaces.length} tarballs, typecheck, build, browser`);
} finally {
  if (keep) console.log(`external fixture retained at ${temporaryRoot}`);
  else await rm(temporaryRoot, { recursive: true, force: true });
}
