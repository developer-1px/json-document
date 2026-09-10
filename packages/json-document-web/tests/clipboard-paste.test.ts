import { afterEach, expect, test, vi } from "vitest";
import { captureWebClipboardPaste, objectClipboardCodec, readWebRasterFile, type WebClipboardEvent } from "../src/index.js";

const payload = { type: objectClipboardCodec.mimeType, text: "Object", objects: [{ id: "a", x: 0, y: 0, width: 1, height: 1, label: "Object", color: "blue" }] };
const file = { name: "picture.png", type: "image/png", size: 100 };
const options = { codec: objectClipboardCodec, files: true, text: true };
function event(values: Record<string, string> = {}, files = [] as typeof file[]) {
  return { clipboardData: { types: Object.keys(values), files, getData: (type: string) => values[type] ?? "", setData() {} }, preventDefault: vi.fn() };
}
afterEach(() => vi.unstubAllGlobals());

test("captures a portable snapshot in strict structured → files → text order before returning from the event", () => {
  const structured = event({ [payload.type]: JSON.stringify(payload), "text/plain": "fallback" }, [file]);
  expect(captureWebClipboardPaste(structured, options)).toEqual({ ok: true, type: "structured", payload });
  expect(structured.preventDefault).toHaveBeenCalledOnce();
  const withFiles = event({ "text/plain": "fallback" }, [file]);
  const captured = captureWebClipboardPaste(withFiles, options);
  withFiles.clipboardData.files.length = 0;
  expect(captured).toEqual({ ok: true, type: "files", files: [file] });
  const plain = event({ "text/plain": "<b>안녕</b>\nSecond" });
  expect(captureWebClipboardPaste(plain, options)).toEqual({ ok: true, type: "text", text: "<b>안녕</b>\nSecond" });
  expect(plain.preventDefault).toHaveBeenCalledOnce();
});

test("invalid owned MIME never becomes files or text, while unmatched data remains native", () => {
  for (const serialized of ["{", "{}", ""]) {
    const owned = event({ [payload.type]: serialized, "text/plain": "fallback" }, [file]);
    expect(captureWebClipboardPaste(owned, options)).toMatchObject({ ok: false, code: "clipboard.invalid" });
    expect(owned.preventDefault).toHaveBeenCalledOnce();
  }
  const html = event({ "text/html": "<p>Unknown</p>" });
  expect(captureWebClipboardPaste(html, options)).toMatchObject({ ok: false, code: "clipboard.empty" });
  expect(html.preventDefault).not.toHaveBeenCalled();
  const plain = event({ "text/plain": "text" });
  expect(captureWebClipboardPaste(plain, { codec: objectClipboardCodec })).toMatchObject({ ok: false, code: "clipboard.empty" });
  expect(plain.preventDefault).not.toHaveBeenCalled();
});

test("unavailable and throwing clipboard reads are observable without exceptions", () => {
  expect(captureWebClipboardPaste({ clipboardData: null, preventDefault() {} }, options)).toMatchObject({ ok: false, code: "clipboard.unavailable" });
  const broken: WebClipboardEvent = { ...event({ "text/plain": "x" }), clipboardData: { types: ["text/plain"], setData() {}, getData() { throw new Error("blocked"); } } };
  expect(captureWebClipboardPaste(broken, options)).toMatchObject({ ok: false, code: "clipboard.unavailable", reason: "blocked" });
});

test.each(["read", "decode"])("raster cancellation during %s releases listeners and settles without late success", async (phase) => {
  const controller = new AbortController();
  const remove = vi.spyOn(controller.signal, "removeEventListener");
  const abort = vi.fn();
  let lateRead: (() => void) | null = null, lateDecode: (() => void) | null = null;
  class Reader {
    result = "data:image/png;base64,AQID"; error = null; onload: (() => void) | null = null; onerror: (() => void) | null = null; onabort: (() => void) | null = null;
    readAsDataURL() { lateRead = this.onload; if (phase === "decode") this.onload?.(); }
    abort = abort;
  }
  class Raster {
    naturalWidth = 100; naturalHeight = 100; onload: (() => void) | null = null; onerror: (() => void) | null = null;
    set src(value: string) { if (value) lateDecode = this.onload; }
  }
  vi.stubGlobal("FileReader", Reader); vi.stubGlobal("Image", Raster);
  const pending = readWebRasterFile(file, { signal: controller.signal });
  await Promise.resolve(); controller.abort();
  expect(await pending).toEqual({ ok: false, code: "raster.cancelled" });
  expect(remove).toHaveBeenCalled();
  if (phase === "read") expect(abort).toHaveBeenCalledOnce();
  (lateRead as (() => void) | null)?.(); (lateDecode as (() => void) | null)?.();
  expect(await readWebRasterFile(file, { signal: controller.signal })).toEqual({ ok: false, code: "raster.cancelled" });
});
