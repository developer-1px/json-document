import type { Pointer } from "../pointer/core.js";

export type JSONValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JSONValue>
  | { readonly [key: string]: JSONValue };

export type JSONPatchOperation =
  | { readonly op: "add"; readonly path: Pointer; readonly value: JSONValue }
  | { readonly op: "remove"; readonly path: Pointer }
  | { readonly op: "replace"; readonly path: Pointer; readonly value: JSONValue }
  | { readonly op: "move"; readonly from: Pointer; readonly path: Pointer }
  | { readonly op: "copy"; readonly from: Pointer; readonly path: Pointer }
  | { readonly op: "test"; readonly path: Pointer; readonly value: JSONValue };

export type JSONChangeMetadata = Readonly<Record<string, JSONValue>>;

export interface JSONDocumentCommitOptions {
  readonly metadata?: JSONChangeMetadata;
}

export interface JSONAppliedChange {
  readonly applied: ReadonlyArray<JSONPatchOperation>;
  readonly metadata?: JSONChangeMetadata;
}

export interface JSONPatchFailure {
  readonly ok: false;
  readonly code: string;
  readonly reason?: string;
  readonly pointer?: Pointer;
}

export type JSONPatchResult =
  | {
      readonly ok: true;
      readonly value: JSONValue;
      readonly change: JSONAppliedChange;
    }
  | JSONPatchFailure;

export type JSONDocumentCommitResult =
  | { readonly ok: true; readonly change: JSONAppliedChange }
  | JSONPatchFailure;

export type JSONPatchValidationResult =
  | { readonly ok: true }
  | JSONPatchFailure;

export type ReadResult =
  | {
      readonly ok: true;
      readonly path: Pointer;
      readonly value: JSONValue;
    }
  | JSONPatchFailure;

export type QueryResult =
  | {
      readonly ok: true;
      readonly query: string;
      readonly pointers: ReadonlyArray<Pointer>;
    }
  | JSONPatchFailure;
