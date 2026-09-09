// @vitest-environment jsdom
import { expect, expectTypeOf, test, vi } from "vitest";
import { captureWebClipboardPaste, objectClipboardCodec, parseWebClipboardHTML, parseWebHTMLFragment, readWebHTMLClipboard, type readWebRasterFile, type WebClipboardPaste, type WebClipboardPayload, type WebRasterSourceResult } from "../src/index.js";

const source = "data:image/png;base64,AQID";
const image = { ok: true as const, dataURL: source, width: 100, height: 50 };
const options = { policy: { acceptedMediaTypes: ["image/*"], maxFiles: 4, maxBytesPerFile: 100 }, maxImagePixels: 10_000 };
const markup = `<p>앞 <strong>문장</strong> &amp; 글<img src="${source}" alt="사진">뒤<br>문장</p>`;
const event = (html = markup, files: File[] = []) => ({ clipboardData: { types: ["text/html", "text/plain"], files, getData: (type: string) => type === "text/html" ? html : "Fallback", setData() {} }, preventDefault: vi.fn() });

test("HTML parts preserve text/image order, entities, and line boundaries", () => {
  expect(parseWebClipboardHTML(markup)).toEqual({ parts: [
    { type: "text", text: "앞 문장 & 글" }, { type: "image", source, label: "사진" }, { type: "text", text: "뒤\n문장" },
  ] });
  expect(parseWebClipboardHTML('<div>One</div><div>Two</div><pre>a\n  b</pre>')?.parts).toEqual([{ type: "text", text: "One\nTwo\na\n  b" }]);
  expect(parseWebClipboardHTML('<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>')?.parts).toEqual([{ type: "text", text: "A\tB\nC\tD" }]);
  expect(parseWebClipboardHTML(`<img src="${source}"><img src="${source}">`)?.parts).toHaveLength(2);
});

test("fragment parsing stays in the template document and excludes active/foreign content", () => {
  const fragment = parseWebHTMLFragment('<script>bad()</script><style>body{color:red}</style><iframe src="/blocked"></iframe><svg><text>foreign</text></svg><template><img src="/hidden"></template><p>Kept</p><img src="/not-fetched">')!;
  const nodes = Array.from(fragment.childNodes) as Node[];
  expect(nodes.map((node) => node.nodeName)).toEqual(["P", "IMG"]);
  expect(nodes.every((node) => !node.isConnected && node.ownerDocument !== document)).toBe(true);
  expect(parseWebClipboardHTML('<script>bad()</script><style>bad</style><p>Kept</p>')?.parts).toEqual([{ type: "text", text: "Kept" }]);
});

test("HTML image capture is opt-in, synchronous, and does not claim text-only HTML", () => {
  const legacy = captureWebClipboardPaste(event(), { files: true, text: true });
  expectTypeOf(legacy).toEqualTypeOf<WebClipboardPaste<WebClipboardPayload>>();
  expect(legacy).toMatchObject({ type: "text", text: "Fallback" });
  const mixed = event();
  expect(captureWebClipboardPaste(mixed, { html: "images" })).toMatchObject({ type: "html", content: { parts: [{ type: "text" }, { type: "image" }, { type: "text" }] } });
  expect(mixed.preventDefault).toHaveBeenCalledOnce();
  const plain = event("<p><strong>Formatted text</strong></p>");
  expect(captureWebClipboardPaste(plain, { files: true, html: "images" })).toMatchObject({ ok: false });
  expect(plain.preventDefault).not.toHaveBeenCalled();
});

test("structured and native files retain priority; equivalent HTML is never inserted twice", () => {
  const withFiles = event('<img src="https://example.invalid/image">', [new File(["image"], "native.png", { type: "image/png" })]);
  expect(captureWebClipboardPaste(withFiles, { files: true, html: "images", text: true })).toMatchObject({ type: "files" });
  const invalid = event(); invalid.clipboardData.types.unshift(objectClipboardCodec.mimeType);
  invalid.clipboardData.getData = () => "{";
  expect(captureWebClipboardPaste(invalid, { codec: objectClipboardCodec, files: true, html: "images", text: true })).toMatchObject({ ok: false, code: "clipboard.invalid" });
  expect(invalid.preventDefault).toHaveBeenCalledOnce();
});

test("a delegated structured format stays with its existing editor binding", () => {
  const delegated = event(); delegated.clipboardData.types.unshift("application/editor+json");
  expect(captureWebClipboardPaste(delegated, { files: true, html: "images", delegatedMimeTypes: ["application/editor+json"] })).toMatchObject({ ok: false, code: "clipboard.empty" });
  expect(delegated.preventDefault).not.toHaveBeenCalled();
});

test.each(["https://example.invalid/image", "/image.png", "blob:https://example.invalid/id", "cid:image", "javascript:alert(1)", "data:image/svg+xml;base64,AQID", "data:image/png;base64,broken", ""])("unavailable HTML source %s fails without reading or fallback", async (src) => {
  const readRaster = vi.fn<typeof readWebRasterFile>();
  expect(await readWebHTMLClipboard(parseWebClipboardHTML(`<p>Text<img src="${src}">After</p>`)!, { ...options, readRaster })).toMatchObject({ ok: false, code: "raster.source-unsupported" });
  expect(readRaster).not.toHaveBeenCalled();
});

test("HTML image preparation owns candidate bytes and preserves every ordered part", async () => {
  const readRaster = vi.fn<typeof readWebRasterFile>().mockResolvedValue(image);
  const result = await readWebHTMLClipboard(parseWebClipboardHTML(markup)!, { ...options, readRaster });
  expect(result).toEqual({ ok: true, parts: [
    { type: "text", text: "앞 문장 & 글" },
    { type: "image", candidate: { name: "사진", size: 3, mediaType: "image/png" }, image: { source, width: 100, height: 50 } },
    { type: "text", text: "뒤\n문장" },
  ] });
  expect(readRaster.mock.calls[0]?.[0]).toBeInstanceOf(File);
});

test("policy rejects before byte allocation, including the current attachment count", async () => {
  const atob = vi.spyOn(globalThis, "atob");
  const readRaster = vi.fn<typeof readWebRasterFile>();
  try {
    expect(await readWebHTMLClipboard(parseWebClipboardHTML(markup)!, { ...options, currentCount: 4, readRaster })).toMatchObject({ ok: false, code: "file-intake.limit" });
    expect(await readWebHTMLClipboard(parseWebClipboardHTML(markup)!, { ...options, policy: { ...options.policy, maxBytesPerFile: 2 }, readRaster })).toMatchObject({ ok: false, code: "file-intake.size" });
    expect(atob).not.toHaveBeenCalled(); expect(readRaster).not.toHaveBeenCalled();
  } finally { atob.mockRestore(); }
});

test("a later decode failure returns neither prepared images nor partial text", async () => {
  const readRaster = vi.fn<typeof readWebRasterFile>().mockResolvedValueOnce(image).mockResolvedValueOnce({ ok: false, code: "raster.decode-failed" });
  expect(await readWebHTMLClipboard(parseWebClipboardHTML(`${markup}<img src="${source}">`)!, { ...options, readRaster })).toEqual({ ok: false, code: "raster.decode-failed" });
});

test("cancellation ignores a late decode and prevents later HTML image reads", async () => {
  let resolve!: (value: WebRasterSourceResult) => void;
  const readRaster = vi.fn<typeof readWebRasterFile>(() => new Promise((done) => { resolve = done; }));
  const controller = new AbortController();
  const pending = readWebHTMLClipboard(parseWebClipboardHTML(`${markup}<img src="${source}">`)!, { ...options, readRaster, signal: controller.signal });
  controller.abort(); resolve(image);
  expect(await pending).toMatchObject({ ok: false, code: "raster.cancelled" }); expect(readRaster).toHaveBeenCalledOnce();
});

test("oversized HTML fails as an owned input rather than falling back to partial text", () => {
  const oversized = event(`<img src="${source}">`.repeat(257));
  expect(captureWebClipboardPaste(oversized, { html: "images", text: true })).toMatchObject({ ok: false, code: "clipboard.invalid" });
  expect(oversized.preventDefault).toHaveBeenCalledOnce();
  expect(() => parseWebClipboardHTML(" ".repeat(16 * 1024 * 1024 + 1))).toThrow(RangeError);
  expect(() => parseWebClipboardHTML("<div></div>".repeat(10_001))).toThrow(RangeError);
});
