import type { JSONValue } from "@interactive-os/json-document";

export interface ObjectBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ObjectPoint extends Record<string, JSONValue> {
  readonly x: number;
  readonly y: number;
}

export interface ObjectDraft extends ObjectBounds, Record<string, JSONValue> {
  readonly label: string;
  readonly color: string;
}

/** The original Object shape remains valid; a missing kind is a labelled rectangle. */
export interface DocumentObject extends ObjectDraft {
  readonly id: string;
}

export interface ObjectDocument extends Record<string, JSONValue> {
  readonly objects: ReadonlyArray<DocumentObject>;
}

export type CanvasObjectKind = "text" | "rectangle" | "ellipse" | "path" | "image";

export type CanvasObjectDraft = ObjectDraft & (
  | { readonly kind: "text"; readonly fontSize: number; readonly fontWeight?: 400 | 700; readonly textAlign?: "left" | "center" | "right" }
  | { readonly kind: "rectangle" | "ellipse"; readonly strokeColor?: string; readonly strokeWidth?: number }
  | { readonly kind: "path"; readonly points: ReadonlyArray<ObjectPoint>; readonly strokeWidth: number }
  | { readonly kind: "image"; readonly source: string }
);

export type CanvasObject = CanvasObjectDraft & { readonly id: string };

/** A fixed, single-slide profile of ObjectDocument, not a parallel object model. */
export interface CanvasDocument extends ObjectDocument {
  readonly profile: "canvas/1";
  readonly width: number;
  readonly height: number;
  readonly objects: ReadonlyArray<CanvasObject>;
}
