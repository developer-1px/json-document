import type {
  JSONPatchOperation,
  JSONResult,
  Pointer,
  SelectionPoint,
} from "@interactive-os/json-document";

export interface RebaseSchema<TDocument = unknown> {
  /**
   * The Zod-compatible schema used by the owning JSON document.
   *
   * This lab accepts only the `safeParse` surface so it does not acquire a
   * second runtime Zod dependency. Failed parses must expose an `issues`
   * collection, matching the contract consumed by core `applyPatch`.
   */
  safeParse(input: unknown):
    | { success: true; data: TDocument }
    | { success: false; error: { issues: ReadonlyArray<unknown> } };
}

export interface RebaseChangeInput<
  TDocument,
  TSelection extends SelectionPoint = Pointer,
> {
  readonly base: TDocument;
  readonly concurrentBatches: ReadonlyArray<ReadonlyArray<JSONPatchOperation>>;
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly selectionAfter?: TSelection;
}

export type RebaseDiagnosticCode =
  | "pointer_shifted"
  | "selection_dropped";

export interface RebaseDiagnostic {
  readonly code: RebaseDiagnosticCode;
  readonly reason: string;
  readonly pointer?: Pointer;
  readonly rebasedPointer?: Pointer;
  readonly operationIndex?: number;
}

export type RebaseConflictCode =
  | "target_changed"
  | "target_removed"
  | "ancestor_replaced"
  | "schema_conflict"
  | "invalid_selection"
  | "unsupported_operation";

export interface RebaseConflict {
  readonly code: RebaseConflictCode;
  readonly reason: string;
  readonly pointer?: Pointer;
  readonly operationIndex?: number;
  readonly concurrentBatchIndex?: number;
  readonly concurrentOperationIndex?: number;
}

export type RebaseChangeResult<
  TSelection extends SelectionPoint = Pointer,
> =
  | {
      readonly ok: true;
      readonly operations: ReadonlyArray<JSONPatchOperation>;
      readonly selectionAfter?: TSelection;
      readonly diagnostics: ReadonlyArray<RebaseDiagnostic>;
    }
  | {
      readonly ok: false;
      readonly code: "concurrent_patch_failed";
      readonly reason: string;
      readonly batchIndex: number;
      readonly result: Extract<JSONResult, { ok: false }>;
    }
  | {
      readonly ok: false;
      readonly code: "change_patch_failed";
      readonly reason: string;
      readonly result: Extract<JSONResult, { ok: false }>;
    }
  | {
      readonly ok: false;
      readonly code: "conflict";
      readonly reason: string;
      readonly conflicts: ReadonlyArray<RebaseConflict>;
    };
