import { createCanvasImage, createCanvasObject, type CanvasObjectDraft, type ObjectBounds } from "@interactive-os/json-document-object-document";
import { objectClipboardFormat, type ObjectClipboard } from "./object.js";

export type CanvasClipboardContent =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "images"; readonly images: ReadonlyArray<{ readonly source: string; readonly width: number; readonly height: number; readonly label: string }> }
  | { readonly type: "mixed"; readonly items: ReadonlyArray<CanvasClipboardItem> };

export type CanvasClipboardItem = { readonly type: "text"; readonly text: string }
  | ({ readonly type: "image" } & Parameters<typeof createCanvasImage>[0]);

export interface CanvasClipboardOptions {
  readonly bounds: ObjectBounds;
  readonly textColor: string;
  readonly fontSize: number;
  readonly imageOffset?: number;
  readonly contentGap?: number;
}

/** External content → domain clipboard. No platform objects, document IDs, or history writes. */
export function createCanvasClipboard(content: CanvasClipboardContent, options: CanvasClipboardOptions): ObjectClipboard {
  const { bounds } = options;
  const offset = options.imageOffset ?? 24;
  if (![bounds.x, bounds.y, offset].every(Number.isFinite)
    || ![bounds.width, bounds.height, options.fontSize].every((value) => Number.isFinite(value) && value > 0)) throw new TypeError("Canvas clipboard geometry and font size must be valid.");
  if ((content.type === "text" && content.text.length === 0) || (content.type === "images" && content.images.length === 0)
    || (content.type === "mixed" && content.items.length === 0)) throw new TypeError("Canvas clipboard must not be empty.");
  const drafts = content.type === "mixed" ? mixedObjects(content.items, options)
    : content.type === "text" ? [textObject(content.text, options)]
    : content.images.map((image, index) => createCanvasImage(image, { ...bounds, x: bounds.x + index * offset, y: bounds.y + index * offset }));
  const objects = drafts.map((object, index) => ({ ...object, id: `clipboard:${index}` }));
  const payload: ObjectClipboard = { type: objectClipboardFormat.mimeType, objects, text: objects.map((object) => object.label).join("\n"), primaryKey: objects.at(-1)!.id };
  if (!objectClipboardFormat.parse(payload)) throw new TypeError("Invalid Canvas clipboard content.");
  return payload;
}

function textObject(text: string, options: CanvasClipboardOptions): CanvasObjectDraft {
  if (text.length === 0) throw new TypeError("Canvas clipboard text must not be empty.");
  return createCanvasObject("text", { ...options.bounds, height: Math.min(options.bounds.height, Math.max(1, text.split("\n").length) * options.fontSize * 1.2) }, { color: options.textColor, fontSize: options.fontSize, label: text });
}

/** Flow order is domain geometry, not a reconstruction of the source page's CSS. */
function mixedObjects(items: ReadonlyArray<CanvasClipboardItem>, options: CanvasClipboardOptions): CanvasObjectDraft[] {
  const gap = options.contentGap ?? 24;
  if (!Number.isFinite(gap) || gap < 0) throw new TypeError("Canvas content gap must be finite and nonnegative.");
  let height = 0;
  const drafts = items.map((item) => {
    const object = item.type === "text" ? textObject(item.text, options) : createCanvasImage(item, options.bounds);
    const positioned = { ...object, y: height };
    height += object.height + gap;
    return positioned;
  });
  const scale = Math.min(1, options.bounds.height / (height - gap));
  return drafts.map((object) => ({ ...object, x: options.bounds.x, y: options.bounds.y + object.y * scale, width: object.width * scale, height: object.height * scale,
    ...(object.kind === "text" ? { fontSize: object.fontSize * scale } : {}),
  }));
}
