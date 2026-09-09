import { assertRasterImageSource, validateFileCandidates, type FileCandidate } from "@interactive-os/json-document-file-intake";
import { parseWebHTMLFragment } from "./html-fragment.js";
import { readWebRasterFiles, type WebRasterFileContent } from "./raster-files.js";

export type WebHTMLClipboardPart =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "image"; readonly source: string; readonly label: string };

export interface WebHTMLClipboardContent { readonly parts: ReadonlyArray<WebHTMLClipboardPart> }
export type WebHTMLClipboardResult =
  | { readonly ok: true; readonly parts: ReadonlyArray<Extract<WebHTMLClipboardPart, { readonly type: "text" }> | ({ readonly type: "image" } & WebRasterFileContent)> }
  | { readonly ok: false; readonly code: string; readonly reason?: string };

/** DOM order and plain text boundaries, without CSS layout, external source resolution, or document semantics. */
export function parseWebClipboardHTML(html: string): WebHTMLClipboardContent | null {
  if (html.length > 16 * 1024 * 1024) throw new RangeError("Clipboard HTML exceeds 16,777,216 code units.");
  const fragment = parseWebHTMLFragment(html);
  if (!fragment) return null;
  const parts: WebHTMLClipboardPart[] = [];
  let text = "", visited = 0;
  const flush = () => { if (text.trim()) parts.push({ type: "text", text: text.trim() }); text = ""; };
  const boundary = () => { if (text && !text.endsWith("\n")) text += "\n"; };
  const stack = Array.from(fragment.childNodes).reverse().map((node) => ({ node, exit: false, pre: false }));
  while (stack.length > 0) {
    const { node, exit, pre } = stack.pop()!;
    if (exit) { boundary(); continue; }
    if (++visited > 10_000 || parts.length > 256) throw new RangeError("Clipboard HTML exceeds the node or content limit.");
    if (node.nodeType === 3) {
      const value = pre ? node.textContent ?? "" : (node.textContent ?? "").replace(/[\t\r\n\f ]+/g, " ");
      text += !pre && /[ \n]$/.test(text) ? value.replace(/^ /, "") : value;
      continue;
    }
    if (node.nodeType !== 1) continue;
    const element = node as Element, tag = element.localName;
    if (tag === "img") {
      flush();
      parts.push({ type: "image", source: (element.getAttribute("src") ?? "").trim(), label: element.getAttribute("alt") ?? "" });
      continue;
    }
    if (tag === "br") { text += "\n"; continue; }
    const block = /^(p|div|h[1-6]|blockquote|pre|ul|ol|li|section|article|header|footer|figure|figcaption|table|tr)$/.test(tag);
    if (block) { boundary(); stack.push({ node, exit: true, pre }); }
    else if (tag === "td" || tag === "th") { if (text && !/[\t\n]$/.test(text)) text += "\t"; }
    for (const child of Array.from(node.childNodes).reverse()) stack.push({ node: child, exit: false, pre: pre || tag === "pre" });
  }
  flush();
  if (parts.length > 256) throw new RangeError("Clipboard HTML exceeds 256 content parts.");
  return parts.length > 0 ? { parts } : null;
}

/** Embedded raster only. Validates every candidate before allocating bytes; prepares one complete ordered result. */
export async function readWebHTMLClipboard(content: WebHTMLClipboardContent, options: Parameters<typeof readWebRasterFiles>[1] & { readonly currentCount?: number }): Promise<WebHTMLClipboardResult> {
  if (options.signal?.aborted) return { ok: false, code: "raster.cancelled" };
  const parts = content.parts.map((part) => ({ ...part }));
  const images = parts.filter((part): part is Extract<WebHTMLClipboardPart, { readonly type: "image" }> => part.type === "image");
  const candidates: FileCandidate[] = [];
  try {
    for (const [index, image] of images.entries()) {
      assertRasterImageSource(image.source);
      const mediaType = image.source.slice(5, image.source.indexOf(";"));
      const bytes = image.source.slice(image.source.indexOf(",") + 1);
      const size = bytes.length / 4 * 3 - (bytes.endsWith("==") ? 2 : bytes.endsWith("=") ? 1 : 0);
      candidates.push({ name: image.label.trim() || `clipboard-image-${index + 1}.${mediaType === "image/jpeg" ? "jpg" : mediaType.slice(6)}`, size, mediaType });
    }
  } catch { return { ok: false, code: "raster.source-unsupported", reason: "HTML images require embedded PNG, JPEG, or WebP content." }; }
  const accepted = validateFileCandidates(candidates, options.policy, options.currentCount === undefined ? {} : { currentCount: options.currentCount });
  if (!accepted.ok) return accepted;
  try {
    const files = images.map((image, index) => {
      const candidate = candidates[index]!;
      const bytes = Uint8Array.from(atob(image.source.slice(image.source.indexOf(",") + 1)), (character) => character.charCodeAt(0));
      return new File([bytes], candidate.name, { type: candidate.mediaType! });
    });
    const prepared = await readWebRasterFiles(files, options);
    if (!prepared.ok) return prepared;
    let index = 0;
    return { ok: true, parts: parts.map((part) => part.type === "text" ? part : { type: "image", ...prepared.files[index++]! }) };
  } catch (error) { return { ok: false, code: "raster.read-failed", reason: error instanceof Error ? error.message : String(error) }; }
}
