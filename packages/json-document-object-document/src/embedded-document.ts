import type {JSONValue} from "@interactive-os/json-document";
import type {CanvasObjectDraft, ObjectBounds} from "./object-model.js";

/** Spatial container for a separately owned document. Like shape creation, finite degenerate extents become one layout unit. */
export function createCanvasEmbeddedDocument(documentType: string, document: JSONValue, bounds: ObjectBounds, label: string): Extract<CanvasObjectDraft,{kind:"embedded-document"}> {
  if (!documentType || ![bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite)) throw new TypeError("Invalid embedded document bounds/type.");
  return {kind:"embedded-document",documentType,document,...bounds,width:Math.max(1,bounds.width),height:Math.max(1,bounds.height),label,color:"transparent"};
}
