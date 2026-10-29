import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";

// Opt-in investigation, not a production importer. No user storage is touched.
// Run with CANVAS_ARTIFACT_EXPERIMENT=1 and an existing local dev server.
// The deliberately small projection exposes fidelity losses instead of claiming
// arbitrary HTML is equivalent to CanvasDocument. Promote no test-local adapter
// to a product path; a supported importer must belong to the Web package.
type Shape = Record<string, string | number> & { id: string; kind: string; label: string };
type Projection = { objects: Shape[]; diagnostics: string[] };

async function project(page: Page, html: string): Promise<Projection> {
  return page.evaluate(async html => {
    document.querySelector("#artifact-experiment")?.remove();
    const frame = document.createElement("iframe");
    frame.id = "artifact-experiment";
    frame.setAttribute("sandbox", "allow-same-origin"); // Never allow generated scripts.
    frame.style.cssText = "position:fixed;inset:0;width:1280px;height:720px;border:0;z-index:99999;background:white";
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const diagnostics: string[] = [];
    for (const node of parsed.querySelectorAll("script,iframe,object,embed,link,meta,base,form")) {
      diagnostics.push(`removed:${node.tagName.toLowerCase()}`); node.remove();
    }
    for (const node of parsed.querySelectorAll("*")) for (const attr of Array.from(node.attributes)) {
      if (/^on/i.test(attr.name) || ["src", "srcset", "href", "action"].includes(attr.name)) {
        diagnostics.push(`removed-attribute:${attr.name}`); node.removeAttribute(attr.name);
      }
    }
    const loaded = new Promise<void>(resolve => frame.onload = () => resolve());
    frame.srcdoc = `<!doctype html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><style>html,body{margin:0;width:1280px;height:720px}</style>${parsed.head.innerHTML}</head><body>${parsed.body.innerHTML}</body>`;
    document.body.append(frame); await loaded;
    const doc = frame.contentDocument!;
    await doc.fonts.ready;
    const objects: Shape[] = [];
    const ids = new Set<string>();
    for (const element of doc.querySelectorAll<HTMLElement>("[data-canvas-id]")) {
      const id = element.dataset.canvasId!;
      if (!id || ids.has(id)) throw Error(`duplicate-or-empty-id:${id}`);
      ids.add(id);
      const css = frame.contentWindow!.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const kind = element.dataset.kind === "text" ? "text" : "rectangle";
      if (rect.width <= 0 || rect.height <= 0) { diagnostics.push(`${id}:empty-bounds`); continue; }
      for (const [property, normal] of [["box-shadow", "none"], ["background-image", "none"], ["transform", "none"], ["filter", "none"], ["border-radius", "0px"], ["letter-spacing", "normal"], ["opacity", "1"]]) {
        if (css.getPropertyValue(property!) !== normal) diagnostics.push(`${id}:unsupported:${property}=${css.getPropertyValue(property!)}`);
      }
      if (parseFloat(css.borderTopWidth) > 0) diagnostics.push(`${id}:unsupported:border`);
      if (css.zIndex !== "auto") diagnostics.push(`${id}:unsupported:stacking-order`);
      if (kind === "text") {
        diagnostics.push(`${id}:approximation:font-family,line-height,text-metrics`);
        if (![400, 700].includes(Number(css.fontWeight))) diagnostics.push(`${id}:unsupported:font-weight=${css.fontWeight}`);
        if (element.children.length) diagnostics.push(`${id}:unsupported:rich-text`);
      }
      if (element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1) diagnostics.push(`${id}:overflow`);
      if (rect.left < 0 || rect.top < 0 || rect.right > 1280 || rect.bottom > 720) diagnostics.push(`${id}:outside-slide`);
      objects.push({ id, kind, x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        label: kind === "text" ? element.innerText : "", color: kind === "text" ? css.color : css.backgroundColor,
        ...(kind === "text" ? { fontSize: parseFloat(css.fontSize), fontWeight: Number(css.fontWeight) >= 600 ? 700 : 400, textAlign: ["center", "right"].includes(css.textAlign) ? css.textAlign : "left", widthMode: "fixed" } : {}),
      });
    }
    for (const element of doc.body.querySelectorAll<HTMLElement>("*:not([data-canvas-id])")) {
      const css = frame.contentWindow!.getComputedStyle(element);
      if (css.backgroundImage !== "none" || !["rgba(0, 0, 0, 0)", "transparent"].includes(css.backgroundColor) || parseFloat(css.borderTopWidth) > 0) diagnostics.push(`unmapped-painted-element:${element.tagName}.${element.className}`);
    }
    // Layout relationships and CSS selectors are not preserved by this projection.
    diagnostics.push("projection:resolved-geometry-only; CSS layout, ancestry, and selectors are not retained");
    return { objects, diagnostics };
  }, html);
}

test("live artifact generation, measured projection and repeated editing", async ({ page, context }, info) => {
  test.skip(process.env.CANVAS_ARTIFACT_EXPERIMENT !== "1", "Explicit opt-in: invokes the local agent and consumes model usage");
  test.setTimeout(600_000);
  await page.goto("/applications/canvas");
  await page.evaluate(async () => {
    const path = "/@fs/Users/user/Desktop/@interactive-os/json-document/packages/json-document-editing/src/index.ts";
    const { createObjectEditor } = await import(/* @vite-ignore */ path);
    (window as any).__artifactEditor = createObjectEditor({ profile: "canvas/1", width: 1280, height: 720, objects: [] });
  });
  let threadId = "";
  let baseline: Shape[] = [];
  let submission = 0;
  let source = "";
  let turnNumber = 0;
  const reports: unknown[] = [];
  const endpoint = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5198";
  const tool = { name: "submit_html_artifact", description: "Submit a complete HTML/CSS slide. The experiment renders it, measures stable data-canvas-id elements, applies a lossy native Canvas projection, and returns diagnostics. This is not a lossless HTML importer. Preserve IDs on revisions. Do not repeatedly resubmit only to fix unsupported projection features.", parameters: { type: "object", properties: { html: { type: "string" } }, required: ["html"], additionalProperties: false } };
  const readTool = { name: "read_artifact", description: "Read the last accepted HTML source and current Canvas objects before editing. The Canvas may include human edits that are absent from the HTML; preserve them. Empty HTML means create the first artifact.", parameters: { type: "object", properties: {}, additionalProperties: false } };

  async function submit(html: string) {
    const started = performance.now();
    const result = await project(page, html);
    expect(result.objects.length).toBeGreaterThan(5);
    const current: Shape[] = await page.evaluate(() => (window as any).__artifactEditor.snapshot.value.objects);
    const conflicts: string[] = [];
    const changes: { id: string; changes: Record<string, string | number> }[] = [];
    const existing = new Map(current.map(object => [object.id, object]));
    const previous = new Map(baseline.map(object => [object.id, object]));
    // This trial handles stable membership only. Structural revisions are reported,
    // never silently converted into deletion/recreation or a whole-document overwrite.
    if (baseline.length && (result.objects.length !== baseline.length || result.objects.some(o => !previous.has(o.id)))) conflicts.push("structure-change:requires-explicit-reconciliation");
    if (baseline.length && result.objects.some((o, i) => o.id !== baseline[i]?.id)) conflicts.push("order-change:requires-explicit-reconciliation");
    for (const next of result.objects) {
      const before = previous.get(next.id); const now = existing.get(next.id);
      if (!before) continue;
      if (!now) { conflicts.push(`${next.id}:deleted`); continue; }
      const patch: Record<string, string | number> = {};
      for (const [key, value] of Object.entries(next)) {
        if (key === "id" || value === before[key]) continue;
        if (now[key] !== before[key] && now[key] !== value) conflicts.push(`${next.id}:${key}`);
        else if (now[key] !== value) patch[key] = value;
      }
      if (Object.keys(patch).length) changes.push({ id: next.id, changes: patch });
    }
    if (!conflicts.length) {
      const applied = await page.evaluate(({ objects, changes, initial }) => {
        const editor = (window as any).__artifactEditor;
        return initial ? [editor.dispatch({ type: "document.replace", document: { profile: "canvas/1", width: 1280, height: 720, objects } })] : changes.map(change => editor.dispatch({ type: "object.update", objectId: change.id, changes: change.changes }));
      }, { objects: result.objects, changes, initial: !baseline.length });
      expect(applied.every((value: any) => value.ok)).toBe(true);
      baseline = result.objects;
      source = html;
    }
    const prefix = `submission-${++submission}`;
    await writeFile(info.outputPath(`${prefix}.html`), html);
    await page.locator("#artifact-experiment").screenshot({ path: info.outputPath(`${prefix}-source.png`) });
    const document = await page.evaluate(() => (window as any).__artifactEditor.snapshot.value);
    await writeFile(info.outputPath(`${prefix}-canvas.json`), JSON.stringify(document, null, 2));
    const report = { submission, objects: result.objects.length, changes, conflicts, diagnostics: result.diagnostics, elapsedMs: performance.now() - started };
    reports.push(report);
    await writeFile(info.outputPath("report.json"), JSON.stringify(reports, null, 2));
    return { ok: !conflicts.length, projection: "lossy-experiment", ...report };
  }

  async function turn(prompt: string) {
    if (process.env.CANVAS_ARTIFACT_REPLAY) {
      const fs = await import("node:fs/promises");
      const html = await fs.readFile(`${process.env.CANVAS_ARTIFACT_REPLAY}/submission-${++turnNumber}.html`, "utf8");
      const result = await submit(html);
      expect(result.ok).toBe(true);
      return;
    }
    const response = await fetch(`${endpoint}/api/llm-agent/turn`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "text/event-stream" }, signal: AbortSignal.timeout(180_000), body: JSON.stringify({ threadId, runId: crypto.randomUUID(), messages: [{ id: crypto.randomUUID(), role: "user", content: prompt }], tools: [readTool, tool], context: [], forwardedProps: { mode: "chat" } }) });
    expect(response.ok).toBe(true);
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = ""; let calls = 0; let finished = false; let transcript = "";
    for (;;) {
      const { done, value } = await reader.read(); buffer += value ?? "";
      const frames = buffer.split(/\r?\n\r?\n/); buffer = frames.pop()!;
      for (const frame of frames) {
        const data = frame.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
        if (!data) continue;
        const event = JSON.parse(data);
        if (event.type === "RUN_STARTED") threadId = event.threadId;
        if (event.type === "RUN_ERROR") throw Error(event.message);
        if (event.type === "RUN_FINISHED") finished = true;
        if (event.type === "TEXT_MESSAGE_CONTENT") transcript += event.delta;
        if (event.type === "CUSTOM" && event.name === "client-tool") {
          let result: unknown;
          try {
            if (event.value.tool === readTool.name) result = { ok: true, html: source, document: await page.evaluate(() => (window as any).__artifactEditor.snapshot.value) };
            else {
              if (++calls > 3) throw Error("submission-limit");
              if (event.value.tool !== tool.name || typeof event.value.arguments?.html !== "string") throw Error("invalid-tool-call");
              result = await submit(event.value.arguments.html);
            }
          } catch (error) { result = { ok: false, error: String(error) }; }
          const posted = await fetch(`${endpoint}/api/llm-agent/tool-results/${encodeURIComponent(event.value.token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) });
          expect(posted.ok).toBe(true);
        }
      }
      if (done) break;
    }
    await writeFile(info.outputPath(`turn-${++turnNumber}.txt`), transcript);
    expect(finished).toBe(true); expect(calls, transcript).toBeGreaterThan(0);
  }

  await turn("실험용 1280x720 한국어 분기 실적 PPT 한 장을 HTML/CSS로 디자인하고 submit_html_artifact 도구로 제출하세요. 제목은 '3분기 실적', 매출 120억, 성장률 24%, 유지율 92%. 편집 가능한 텍스트와 배경 요소 8개 이상. CSS flex/grid 등 익숙한 방식으로 디자인하세요. 모든 보이는 텍스트는 자식 없는 요소에 data-kind='text'와 고유 data-canvas-id를, 모든 배경 도형에도 고유 data-canvas-id를 붙이세요. 제목 ID는 title, 매출 숫자는 revenue, 성장률 숫자는 growth. 텍스트와 배경은 분리. JS·외부 리소스 없이 inline style 태그 사용. 한 번 제출 후 멈추세요. 변환 한계 때문에 디자인을 단순화하지 마세요.");
  expect(baseline.some(o => o.id === "title")).toBe(true);
  const firstIds = baseline.map(o => o.id);
  await turn("기존 소스와 모든 ID·디자인을 유지하면서 revenue의 매출 숫자만 135억으로 수정해 전체 HTML을 submit_html_artifact로 한 번 제출하세요.");
  expect(baseline.map(o => o.id)).toEqual(firstIds);
  expect(baseline.find(o => o.id === "revenue")?.label).toContain("135");
  const humanResult = await page.evaluate(() => (window as any).__artifactEditor.dispatch({ type: "object.update", objectId: "title", changes: { label: "사람이 수정한 제목" } }));
  expect(humanResult.ok).toBe(true);
  await turn("기존 소스와 ID·디자인을 유지하면서 growth 숫자만 31%로 수정해 전체 HTML을 submit_html_artifact로 한 번 제출하세요. 다른 요소는 그대로 두세요.");
  const final = await page.evaluate(() => (window as any).__artifactEditor.snapshot.value);
  expect(final.objects.find((o: Shape) => o.id === "title").label).toBe("사람이 수정한 제목");
  expect(final.objects.find((o: Shape) => o.id === "growth").label).toContain("31");
  // Deliberate same-field stale edit: must reject without changing the document.
  const latest = await import("node:fs/promises").then(fs => fs.readFile(info.outputPath(`submission-${submission}.html`), "utf8"));
  // Force a concurrent edit after the last accepted baseline, even if the model
  // incorporated the previous human title into its newly submitted source.
  await page.evaluate(() => (window as any).__artifactEditor.dispatch({ type: "object.update", objectId: "title", changes: { label: "사람의 추가 수정" } }));
  const beforeConflict = await page.evaluate(() => (window as any).__artifactEditor.snapshot.value);
  const staleSource = await page.evaluate(html => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelector('[data-canvas-id="title"]')!.textContent = "에이전트가 바꾼 제목";
    return doc.documentElement.outerHTML;
  }, latest);
  const stale = await submit(staleSource);
  expect(stale.conflicts).toContain("title:label");
  expect(await page.evaluate(() => (window as any).__artifactEditor.snapshot.value)).toEqual(beforeConflict);
  const preview = await context.newPage();
  await preview.addInitScript(value => localStorage.setItem("json-document.canvas.v1", JSON.stringify(value)), final);
  await preview.goto("/applications/canvas");
  await expect(preview.locator("[data-canvas-object]")).toHaveCount(final.objects.length);
  await preview.screenshot({ path: info.outputPath("native-canvas.png") });
  // Compare the alternative: keep HTML/CSS as the rendering source and reconcile
  // this supported human text edit by stable ID. This does not solve arbitrary
  // React reverse editing; it isolates whether flattening caused visual loss.
  const retained = await page.evaluate(({ html, title }) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const styles = Array.from(doc.querySelectorAll("style")).map(node => node.textContent);
    doc.querySelector('[data-canvas-id="title"]')!.textContent = title;
    return { html: doc.documentElement.outerHTML, styles };
  }, { html: latest, title: final.objects.find((o: Shape) => o.id === "title").label });
  const retainedProjection = await project(page, retained.html);
  expect(retainedProjection.objects.find(o => o.id === "title")?.label).toBe("사람이 수정한 제목");
  expect(retainedProjection.objects.find(o => o.id === "revenue")?.label).toContain("135");
  expect(retainedProjection.objects.find(o => o.id === "growth")?.label).toContain("31");
  expect(await page.evaluate(() => Array.from((document.querySelector("#artifact-experiment") as HTMLIFrameElement).contentDocument!.querySelectorAll("style")).slice(1).map(node => node.textContent))).toEqual(retained.styles);
  await writeFile(info.outputPath("retained-source.html"), retained.html);
  await page.locator("#artifact-experiment").screenshot({ path: info.outputPath("retained-source.png") });
  await info.attach("experiment-report", { path: info.outputPath("report.json"), contentType: "application/json" });
});
