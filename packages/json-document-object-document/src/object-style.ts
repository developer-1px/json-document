import type { DocumentObject } from "./object-model.js";

/** Object-level styles, not character-range formatting. Color is the kind's primary paint. */
export interface ObjectStyle {
  readonly color: string;
  readonly fontSize: number;
  readonly fontWeight: 400 | 700;
  readonly textAlign: "left" | "center" | "right";
  readonly strokeColor: string;
  readonly strokeWidth: number;
}

/** Missing means unsupported by every target; null means mixed among supporting targets. */
export type ObjectStyleSelection = { readonly [Key in keyof ObjectStyle]?: ObjectStyle[Key] | null };

/** Effective values and capabilities have one owner, including legacy defaults. */
export function getObjectStyle(object: DocumentObject): Partial<ObjectStyle> {
  const color = object.color ?? "transparent";
  switch (object.kind) {
    case "image": return {};
    case "text": return { color, fontSize: object.fontSize as number, fontWeight: (object.fontWeight ?? 400) as 400 | 700, textAlign: (object.textAlign ?? "left") as ObjectStyle["textAlign"] };
    case "rectangle": case "ellipse": return { color, strokeColor: (object.strokeColor ?? "#000000") as string, strokeWidth: (object.strokeWidth ?? 0) as number };
    case "path": return { color, strokeWidth: object.strokeWidth as number };
    default: return { color };
  }
}

export function readObjectStyle(objects: ReadonlyArray<DocumentObject>): ObjectStyleSelection {
  const selection: Record<string, string | number | null> = {};
  for (const object of objects) {
    for (const [key, value] of Object.entries(getObjectStyle(object))) {
      selection[key] = selection[key] === undefined ? value : selection[key] === value ? value : null;
    }
  }
  return selection;
}

/** Validate the complete request before planning any target, even unsupported properties. */
export function assertObjectStyle(value: unknown): asserts value is Partial<ObjectStyle> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Object style must be a record.");
  for (const [key, field] of Object.entries(value)) {
    const valid = key === "color" || key === "strokeColor" ? typeof field === "string" && field.length > 0
      : key === "fontSize" ? typeof field === "number" && Number.isFinite(field) && field > 0
      : key === "strokeWidth" ? typeof field === "number" && Number.isFinite(field) && field >= 0
      : key === "fontWeight" ? field === 400 || field === 700
      : key === "textAlign" ? field === "left" || field === "center" || field === "right"
      : false;
    if (!valid) throw new TypeError(`Invalid Object style: ${key}.`);
  }
}
