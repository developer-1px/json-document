import { expect, test } from "@playwright/test";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

// Only remove IDs created by these tests; user recordings are never touched.
const created = new Set<string>();
test.afterEach(async () => {
  for (const id of created) await rm(resolve(process.cwd(), `.artifacts/interaction-recordings/${id}.json`), { force: true });
  created.clear();
});

test("REC on Bear saves native events, source commits and undo evidence to an agent-readable file", async ({ page }) => {
  await page.goto("/applications/bear");
  const editor = page.getByRole("textbox", { name: "Markdown 문서" });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText("base ");
  await page.getByRole("button", { name: "REC 기록 시작" }).click();
  await expect(editor).toBeFocused();
  const client = await page.context().newCDPSession(page);
  await client.send("Input.imeSetComposition", { text: "한글", selectionStart: 2, selectionEnd: 2 });
  await client.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Process", code: "Enter", windowsVirtualKeyCode: 229 });
  await client.send("Input.insertText", { text: "한글" });
  await page.keyboard.down("Enter");
  await page.keyboard.up("Enter");
  await expect.poll(() => editor.textContent()).toBe("base 한글\n");
  await page.keyboard.press("ControlOrMeta+z");
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => editor.textContent()).toBe("base ");
  const response = page.waitForResponse(async response => response.url().endsWith("/__interaction-recordings")
    && response.request().method() === "POST" && JSON.parse(response.request().postData()!).endedAt !== null);
  await page.getByRole("button", { name: "기록 종료" }).click();
  const receipt = await (await response).json();
  created.add(receipt.id);
  await expect(page.getByRole("status")).toContainText("저장됨");
  const recording = JSON.parse(await readFile(receipt.path, "utf8"));
  expect(recording.server.worktree).toBe(process.cwd());
  expect(recording.endedAt).toBeTruthy();
  expect(recording.records.some((record: any) => record.kind === "event.capture" && record.detail.type === "compositionend")).toBe(true);
  const commands = recording.records.filter((record: any) => record.kind === "contenteditable.command");
  expect(commands.filter((record: any) => record.detail.extra.command === "undo")).toHaveLength(2);
  const commits = recording.records.filter((record: any) => record.kind === "contenteditable.document-commit");
  expect(commits.length).toBeGreaterThanOrEqual(4);
  expect(commands.every((record: any) => record.eventId !== null)).toBe(true);
  await page.screenshot({ path: "/tmp/interaction-recorder-bear.png" });
  await client.detach();
});

test("REC is available outside Bear and failed saves survive reload for automatic retry", async ({ page }) => {
  await page.goto("/demo/markdown-caret");
  await page.route("**/__interaction-recordings", route => route.request().method() === "POST"
    ? route.fulfill({ status: 503, contentType: "application/json", body: '{}' }) : route.continue());
  await page.getByRole("button", { name: "REC 기록 시작" }).click();
  await page.getByTestId("markdown-editor").click();
  await page.keyboard.insertText("재현");
  await page.getByRole("button", { name: "기록 종료" }).click();
  await expect(page.getByRole("status")).toContainText("서버 저장 실패");
  await expect(page.getByRole("button", { name: "JSON", exact: true })).toBeVisible();
  const pending = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("json-document.interaction-recording.pending.")));
  expect(pending).toHaveLength(1);
  created.add(pending[0]!.split(".").at(-1)!);
  await page.unroute("**/__interaction-recordings");
  await page.reload();
  await expect(page.getByRole("status")).toContainText("저장됨");
  const stored = JSON.parse(await readFile(resolve(process.cwd(), `.artifacts/interaction-recordings/${[...created][0]}.json`), "utf8"));
  expect(stored.environment.initialPath).toBe("/demo/markdown-caret");
  expect(stored.records.some((record: any) => record.kind === "contenteditable.document-commit")).toBe(true);
});
