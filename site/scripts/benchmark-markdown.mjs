import fs from "node:fs/promises";
import { chromium } from "@playwright/test";

// Run against an already-built site preview. Each sample waits for its frame to finish.
const [url, output] = process.argv.slice(2);
if (!url || !output) throw new Error("Usage: node site/scripts/benchmark-markdown.mjs <preview-url> <output.json>");
const unit = "Markdown 원문을 **그대로 보존**합니다. 한글 입력과 __방향 있는 선택__을 확인합니다. 문서를 읽고 수정합니다.\n";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const client = await page.context().newCDPSession(page);
const results = { date: new Date().toISOString(), browser: browser.version(), url, rows: [] };
try {
  for (const size of [1000, 10000, 50000, 100000]) {
    await page.goto(url);
    const root = page.getByTestId("markdown-editor");
    await root.waitFor();
    const source = unit.repeat(Math.ceil(size / unit.length)).slice(0, size);
    await root.evaluate((root, source) => {
      root.focus();
      const range = document.createRange();
      range.selectNodeContents(root);
      const selection = document.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/plain", source);
      root.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }));
    }, source);
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      window.timings = [];
      const measure = () => {
        const start = performance.now();
        requestAnimationFrame(() => {
          document.body.getBoundingClientRect();
          window.timings.push(performance.now() - start);
        });
      };
      document.addEventListener("beforeinput", event => {
        if (event.inputType === "insertText" && !event.isComposing) measure();
      }, true);
      document.addEventListener("compositionend", measure, true);
    });
    for (const mode of ["typing", "ime-enter"]) {
      await page.evaluate(() => { window.timings = []; });
      for (let index = 0; index < 25; index++) {
        if (mode === "typing") await page.keyboard.type("x");
        else {
          await client.send("Input.imeSetComposition", { text: "한글", selectionStart: 2, selectionEnd: 2 });
          await client.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 229 });
          await client.send("Input.insertText", { text: "한글" });
          await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
        }
        await page.waitForFunction(count => window.timings.length >= count, index + 1);
        await page.waitForTimeout(100);
      }
      const samples = await page.evaluate(() => window.timings.slice(5));
      const sorted = [...samples].sort((a, b) => a - b);
      const row = { size, mode, samples, median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.ceil(sorted.length * .95) - 1] };
      results.rows.push(row);
      await fs.writeFile(output, JSON.stringify(results, null, 2));
      console.log(JSON.stringify(row));
    }
    const model = JSON.parse(await page.getByTestId("markdown-source-json").textContent()).source;
    if (model.length !== size + 100) throw new Error("Input or IME Enter was lost or duplicated");
  }
} finally {
  await browser.close();
}
