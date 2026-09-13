import type {JSONValue} from "@interactive-os/json-document";
import type {CanvasObjectDraft, ObjectBounds} from "./object-model.js";

/** Spatial container for a separately owned document; its model is never duplicated here. */
export function createCanvasEmbeddedDocument(documentType: string, document: JSONValue, bounds: ObjectBounds, label: string): Extract<CanvasObjectDraft,{kind:"embedded-document"}> {
  if (!documentType || ![bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0) throw new TypeError("Invalid embedded document bounds/type.");
  return {kind:"embedded-document",documentType,document,...bounds,label,color:"transparent"};
}
