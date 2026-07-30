export type JSONValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JSONValue>
  | { readonly [key: string]: JSONValue };

export type Pointer = string;

export type JSONPatchOperation =
  | { readonly op: "add"; readonly path: Pointer; readonly value: JSONValue }
  | { readonly op: "remove"; readonly path: Pointer }
  | { readonly op: "replace"; readonly path: Pointer; readonly value: JSONValue }
  | { readonly op: "move"; readonly from: Pointer; readonly path: Pointer }
  | { readonly op: "copy"; readonly from: Pointer; readonly path: Pointer }
  | { readonly op: "test"; readonly path: Pointer; readonly value: JSONValue };

export type JSONChangeMetadata = Readonly<Record<string, JSONValue>>;

export interface JSONAppliedChange {
  readonly applied: ReadonlyArray<JSONPatchOperation>;
  readonly metadata?: JSONChangeMetadata;
}

export interface JSONDocumentCommitOptions {
  readonly metadata?: JSONChangeMetadata;
}

export type JSONPatchValidationResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason?: string;
      readonly pointer?: Pointer;
    };

/** @deprecated Use JSONPatchValidationResult. */
export type JSONCapabilityResult = JSONPatchValidationResult;

export interface JSONDocumentOptions {
  readonly validate?: (candidate: JSONValue) => JSONPatchValidationResult;
  /** @deprecated Use validate. */
  readonly accepts?: (candidate: JSONValue) => JSONCapabilityResult;
}

export type ReadResult =
  | { readonly ok: true; readonly path: Pointer; readonly value: JSONValue }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason?: string;
      readonly pointer?: Pointer;
    };

export type QueryResult =
  | {
      readonly ok: true;
      readonly query: string;
      readonly pointers: ReadonlyArray<Pointer>;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason?: string;
    };

export type JSONPatchResult =
  | {
      readonly ok: true;
      readonly value: JSONValue;
      readonly change: JSONAppliedChange;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason?: string;
      readonly pointer?: Pointer;
    };

export type JSONDocumentCommitResult =
  | { readonly ok: true; readonly change: JSONAppliedChange }
  | Extract<JSONPatchResult, { readonly ok: false }>;

export interface JSONDocument {
  readonly value: JSONValue;
  at(pointer: Pointer): ReadResult;
  query(jsonPath: string): QueryResult;
  validatePatch(
    operations: ReadonlyArray<JSONPatchOperation>,
  ): JSONPatchValidationResult;
  /** @deprecated Use validatePatch. */
  canPatch(
    operations: ReadonlyArray<JSONPatchOperation>,
  ): JSONCapabilityResult;
  commit(
    operations: ReadonlyArray<JSONPatchOperation>,
    options?: JSONDocumentCommitOptions,
  ): JSONDocumentCommitResult;
  subscribe(listener: (change: JSONAppliedChange) => void): () => void;
}
