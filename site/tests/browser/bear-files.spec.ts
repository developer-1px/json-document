import { expect, test } from "@playwright/test";
import { unlink } from "node:fs/promises";
import { join } from "node:path";

test("Bear creates, opens and updates a local Markdown file", async ({ page, request }) => {
  const name = `bear-test-${crypto.randomUUID()}.md`;
  const { directory } = await (await request.get("/api/local-markdown/")).json();
  try {
    await page.goto("/applications/bear");
    await page.getByRole("button", { name: "로컬 파일", exact: true }).click();
    await page.getByRole("textbox", { name: "파일 이름", exact: true }).fill(name);
    await page.getByRole("button", { name: "파일 저장", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: /^파일에 저장됨$/ })).toBeVisible();
    const first = await (await request.get(`/api/local-markdown/${name}`)).json();
    expect(first.source).toContain("# Bear");
    const editor = page.getByRole("textbox", { name: "Markdown 문서", exact: true });
    await editor.press("ControlOrMeta+End");
    await page.keyboard.insertText(" 파일로 저장할 문장");
    await expect(page.getByRole("status").filter({ hasText: "파일에 저장할 변경 있음" })).toBeVisible();
    await page.getByRole("button", { name: "파일 저장", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: /^파일에 저장됨$/ })).toBeVisible();
    const saved = await (await request.get(`/api/local-markdown/${name}`)).json();
    expect(saved.source).toContain("파일로 저장할 문장");
    await editor.press("ControlOrMeta+End");
    await page.keyboard.insertText(" 아직 저장 안 함");
    await page.getByRole("button", { name: "로컬 파일", exact: true }).click();
    await page.getByRole("button", { name: "파일 불러오기", exact: true }).click();
    await page.getByRole("option", { name, exact: true }).click();
    await expect(editor).toContainText("파일로 저장할 문장");
    await expect(editor).not.toContainText("아직 저장 안 함");
    // Simulate a different writer updating the same file.
    expect((await request.put(`/api/local-markdown/${name}`, { data: { source: "# 외부 수정", version: saved.version } })).ok()).toBe(true);
    await page.getByRole("button", { name: "파일 저장", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("밖에서 변경");
    expect((await (await request.get(`/api/local-markdown/${name}`)).json()).source).toBe("# 외부 수정");
  } finally { await unlink(join(directory, name)).catch(() => {}); }
});
