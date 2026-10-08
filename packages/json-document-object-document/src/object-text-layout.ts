import type { ObjectDraft } from "./object-model.js";
import { projectObjectText, type ObjectTextProjection } from "./object-projection.js";

export type ObjectTextMeasurer = (text: ObjectTextProjection) => { readonly width: number; readonly height: number };

/** Text owns its height. Auto width follows explicit lines; fixed width wraps. */
export function layoutObjectText<Object extends ObjectDraft>(object: Object, measure?: ObjectTextMeasurer): Object {
  if (object.kind !== "text" || !measure) return object;
  const projection = projectObjectText({ ...object, id: "layout" })!;
  const size = measure(projection);
  if (![size.width, size.height].every(value => Number.isFinite(value) && value > 0)) throw new TypeError("Text measurement must be positive and finite.");
  const width = object.widthMode === "auto" ? size.width : object.width;
  return width === object.width && size.height === object.height ? object : { ...object, width, height: size.height };
}
