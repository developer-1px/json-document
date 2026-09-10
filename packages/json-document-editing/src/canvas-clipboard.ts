import { createCanvasImage, createCanvasObject, type ObjectBounds } from "@interactive-os/json-document-object-document";
import { objectClipboardFormat, type ObjectClipboard } from "./object.js";

export type CanvasClipboardContent =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "images"; readonly images: ReadonlyArray<{ readonly source: string; readonly width: number; readonly height: number; readonly label: string }> };

export interface CanvasClipboardOptions {
  readonly bounds: ObjectBounds;
  readonly textColor: string;
  readonly fontSize: number;
  readonly imageOffset?: number;
}

/** External content → domain clipboard. No platform objects, document IDs, or history writes. */
export function createCanvasClipboard(content: CanvasClipboardContent, options: CanvasClipboardOptions): ObjectClipboard {
  const { bounds } = options;
  const offset = options.imageOffset ?? 24;
  if (![bounds.x, bounds.y, offset].every(Number.isFinite)
    || ![bounds.width, bounds.height, options.fontSize].every((value) => Number.isFinite(value) && value > 0)) throw new TypeError("Canvas clipboard geometry and font size must be valid.");
  if ((content.type === "text" && content.text.length === 0) || (content.type === "images" && content.images.length === 0)) throw new TypeError("Canvas clipboard must not be empty.");
  const drafts = content.type === "text"
    ? [createCanvasObject("text", { ...bounds, height: Math.min(bounds.height, Math.max(1, content.text.split("\n").length) * options.fontSize * 1.2) }, { color: options.textColor, fontSize: options.fontSize, label: content.text })]
    : content.images.map((image, index) => createCanvasImage(image, { ...bounds, x: bounds.x + index * offset, y: bounds.y + index * offset }));
  const objects = drafts.map((object, index) => ({ ...object, id: `clipboard:${index}` }));
  const payload: ObjectClipboard = { type: objectClipboardFormat.mimeType, objects, text: objects.map((object) => object.label).join("\n"), primaryKey: objects.at(-1)!.id };
  if (!objectClipboardFormat.parse(payload)) throw new TypeError("Invalid Canvas clipboard content.");
  return payload;
}
