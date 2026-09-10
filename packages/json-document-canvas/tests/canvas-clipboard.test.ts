import { expect, test, vi } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createObjectEditor } from "@interactive-os/json-document-editing";
import { parseCanvasDocument, serializeCanvasDocument, type CanvasDocument } from "@interactive-os/json-document-object-document";
import { objectClipboardCodec, type readWebRasterFile, type WebClipboardData, type WebRasterSourceResult } from "@interactive-os/json-document-web";
import { createCanvasClipboardBinding } from "../src/index.js";

const blank: CanvasDocument = { profile: "canvas/1", width: 1280, height: 720, objects: [] };
const style = { textColor: "black", fontSize: 32 };
const png = "data:image/png;base64,AQID";
const file = { name: "picture.png", size: 3, type: "image/png" };
function event(files = [] as typeof file[], values: Record<string, string> = {}) {
  const data: WebClipboardData = { files, get types() { return Object.keys(values); }, getData: (type) => values[type] ?? "", setData: (type, value) => { values[type] = value; } };
  return { clipboardData: data, preventDefault: vi.fn() };
}
function setup(readRaster: typeof readWebRasterFile = vi.fn(async (): Promise<WebRasterSourceResult> => ({ ok: true, dataURL: png, width: 1600, height: 800 }))) {
  let id = 0;
  const document = createJSONDocument(blank), editor = createObjectEditor(document, { createId: () => `image-${++id}` });
  const commits = vi.fn(), onResult = vi.fn(); document.subscribe(commits);
  const binding = createCanvasClipboardBinding(editor, style, { readRaster, onResult });
  return { editor, binding, readRaster, onResult, commits, value: () => editor.snapshot.value as CanvasDocument };
}

test("image batch is one commit with decoded fit, fresh IDs, primary, native copy and JSON round-trip", async () => {
  const { binding, editor, value, commits } = setup();
  const pasted = event([file, { ...file, name: "second.png" }], { "text/plain": "image fallback" });
  const pending = binding.paste(pasted);
  expect(pasted.preventDefault).toHaveBeenCalledOnce(); expect(binding.pending).toBe(true); expect(commits).not.toHaveBeenCalled();
  expect((await pending).ok).toBe(true);
  expect(value().objects.map((object) => [object.kind, object.x, object.y, object.width, object.height, object.source])).toEqual([
    ["image", 24, 24, 960, 480, png], ["image", 48, 48, 960, 480, png],
  ]);
  expect(editor.snapshot.selection).toMatchObject({ keys: ["image-1", "image-2"], primaryKey: "image-2" });
  expect(parseCanvasDocument(serializeCanvasDocument(value()))).toEqual(value());
  expect(commits).toHaveBeenCalledOnce();
  const copied = event(); binding.copy(copied);
  editor.undo(); expect(value()).toEqual(blank);
  await binding.paste(copied); expect(value().objects).toHaveLength(2); expect(editor.snapshot.selection.keys).toEqual(["image-3", "image-4"]);
  expect(value().objects[0]!.source).toBe(png);
  editor.dispatch({ type: "object.translate", objectIds: editor.snapshot.selection.keys, dx: 10, dy: 10 });
  editor.dispatch({ type: "object.resize", objectIds: ["image-4"], dx: 0, dy: 0, dw: 20, dh: 10 });
  editor.dispatch({ type: "object.duplicate", objectIds: editor.snapshot.selection.keys });
  expect(value().objects.at(-1)!.source).toBe(png);
  editor.dispatch({ type: "selection.remove" }); expect(value().objects).toHaveLength(2);
});

test.each([
  { files: [{ ...file, type: "image/svg+xml" }], code: "file-intake.media-type" },
  { files: [{ ...file, size: 11 * 1024 * 1024 }], code: "file-intake.size" },
  { files: Array.from({ length: 5 }, () => file), code: "file-intake.limit" },
])("$code rejects before reading any bytes", async ({ files, code }) => {
  const { binding, readRaster, value } = setup();
  expect(await binding.paste(event(files))).toMatchObject({ ok: false, code });
  expect(readRaster).not.toHaveBeenCalled(); expect(value()).toEqual(blank);
});

test.each(["raster.decode-failed", "raster.pixel-limit"])("%s rejects the entire image batch without IDs/history or partial insertion", async (code) => {
  const readRaster = vi.fn<() => Promise<WebRasterSourceResult>>()
    .mockResolvedValueOnce({ ok: true, dataURL: png, width: 100, height: 100 })
    .mockResolvedValueOnce(code === "raster.decode-failed" ? { ok: false, code } : { ok: true, dataURL: png, width: 5000, height: 5000 });
  const { binding, value, editor, onResult } = setup(readRaster);
  expect(await binding.paste(event([file, file]))).toMatchObject({ ok: false, code });
  expect(value()).toEqual(blank); expect(editor.snapshot.canUndo).toBe(false); expect(onResult).toHaveBeenCalledOnce();
  await binding.paste(event([], { "text/plain": "After failure" })); expect(value().objects[0]!.id).toBe("image-1");
});

test("plain text is literal and synchronous, repeats cascade; malformed structured payload never degrades to text", async () => {
  const { binding, value, readRaster } = setup();
  const text = event([], { "text/plain": "<b>안녕</b>\nCanvas" });
  const first = binding.paste(text); expect(value().objects).toHaveLength(1); await first;
  await binding.paste(text); expect(value().objects.map((object) => object.x)).toEqual([24, 48]);
  expect(value().objects[0]).toMatchObject({ kind: "text", label: "<b>안녕</b>\nCanvas" });
  expect(await binding.paste(event([file], { [objectClipboardCodec.mimeType]: "{", "text/plain": "Fallback" }))).toMatchObject({ ok: false, code: "clipboard.invalid" });
  expect(value().objects).toHaveLength(2); expect(readRaster).not.toHaveBeenCalled();
});

test("cancellation aborts platform preparation; later resolution cannot commit or notify", async () => {
  let resolve!: (result: WebRasterSourceResult) => void;
  const readRaster = vi.fn<typeof readWebRasterFile>(() => new Promise<WebRasterSourceResult>((done) => { resolve = done; }));
  const { binding, value, onResult } = setup(readRaster);
  const pending = binding.paste(event([file]));
  binding.cancel(); expect(await pending).toMatchObject({ ok: false, code: "clipboard.cancelled" });
  expect(readRaster.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  resolve({ ok: true, dataURL: png, width: 100, height: 100 }); await Promise.resolve();
  expect(value()).toEqual(blank); expect(onResult).not.toHaveBeenCalled();
});
