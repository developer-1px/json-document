import { expect, test, vi } from "vitest";
import { captureWebClipboardPaste, readWebRasterFiles, type readWebRasterFile, type WebRasterSourceResult } from "../src/index.js";

const file = { name: "image.png", size: 3, type: "image/png" };
const image = { ok: true as const, dataURL: "data:image/png;base64,AQID", width: 100, height: 50 };
const policy = { acceptedMediaTypes: ["image/*"], maxFiles: 4, maxBytesPerFile: 100 };
const options = { policy, maxImagePixels: 10_000 };

test("PI-FILE: sequential decoding yields portable image content in file order", async () => {
  let first!: (value: WebRasterSourceResult) => void;
  const readRaster = vi.fn<typeof readWebRasterFile>().mockImplementationOnce(() => new Promise((resolve) => { first = resolve; })).mockResolvedValue(image);
  const pending = readWebRasterFiles([file, { ...file, name: "second.png" }], { ...options, readRaster });
  expect(readRaster).toHaveBeenCalledOnce();
  first(image);
  expect(await pending).toEqual({ ok: true, files: [file.name, "second.png"].map((name) => ({ candidate: { name, size: 3, mediaType: "image/png" }, image: { source: image.dataURL, width: 100, height: 50 } })) });
  expect(readRaster).toHaveBeenCalledTimes(2);
});

test.each([
  { input: { ...file, size: 101 }, code: "file-intake.size" },
  { input: { ...file, type: "image/svg+xml" }, code: "raster.unsupported" },
  { input: { ...file, name: "" }, code: "file-intake.invalid" },
])("PI-FILE: $code is rejected before reading", async ({ input, code }) => {
  const readRaster = vi.fn<typeof readWebRasterFile>();
  expect(await readWebRasterFiles([input], { ...options, readRaster })).toMatchObject({ ok: false, code });
  expect(readRaster).not.toHaveBeenCalled();
});

test.each([
  { result: { ...image, height: 200 }, code: "raster.pixel-limit" },
  { result: { ...image, dataURL: "https://example.com/image.png" }, code: "raster.decode-failed" },
  { result: { ...image, width: NaN }, code: "raster.decode-failed" },
])("PI-FILE: $code returns no partial batch", async ({ result, code }) => {
  const readRaster = vi.fn<typeof readWebRasterFile>().mockResolvedValueOnce(image).mockResolvedValueOnce(result);
  expect(await readWebRasterFiles([file, file], { ...options, readRaster })).toMatchObject({ ok: false, code });
});

test("PI-CANCEL: cancellation between decoded files prevents subsequent reads", async () => {
  const controller = new AbortController();
  const readRaster = vi.fn<typeof readWebRasterFile>(async () => { controller.abort(); return image; });
  expect(await readWebRasterFiles([file, file], { ...options, readRaster, signal: controller.signal })).toMatchObject({ code: "raster.cancelled" });
  expect(readRaster).toHaveBeenCalledOnce();
});

test("file-only Clipboard consumers capture native files without borrowing an Object codec", () => {
  const files = [file], preventDefault = vi.fn();
  const event = { clipboardData: { files, types: ["Files", "text/html"], getData: () => "<img>", setData() {} }, preventDefault };
  const captured = captureWebClipboardPaste(event, { files: true });
  files.length = 0;
  expect(captured).toEqual({ ok: true, type: "files", files: [file] }); expect(preventDefault).toHaveBeenCalledOnce();
  expect(captureWebClipboardPaste({ ...event, clipboardData: { ...event.clipboardData, types: ["text/plain"] } }, { files: true })).toMatchObject({ ok: false, code: "clipboard.empty" });
});
