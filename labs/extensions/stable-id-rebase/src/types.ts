import type {
  JSONCapabilityResult,
  JSONPatchOperation,
  Pointer,
} from "@interactive-os/json-document";
import type {
  IdResolverScope,
  ResolveIdErrorCode,
} from "@interactive-os/json-document-id-resolver";

export interface StableIdTarget {
  readonly scope: string;
  readonly id: string;
}

export interface StableIdReplaceInput {
  readonly scopes: ReadonlyArray<IdResolverScope>;
  readonly target: StableIdTarget;
  readonly relativePath: Pointer;
  readonly expected: unknown;
  readonly value: unknown;
  readonly relativeSelectionAfter?: Pointer;
}

export interface StableIdRebaseDiagnostic {
  readonly code: "selection_dropped";
  readonly reason: string;
  readonly pointer: Pointer;
}

export type StableIdRebaseResult =
  | {
      readonly ok: true;
      readonly operations: ReadonlyArray<JSONPatchOperation>;
      readonly selectionAfter?: Pointer;
      readonly diagnostics: ReadonlyArray<StableIdRebaseDiagnostic>;
    }
  | {
      readonly ok: false;
      readonly code: "invalid_change";
      readonly reason: string;
      readonly pointer?: Pointer;
    }
  | {
      readonly ok: false;
      readonly code: "identity_resolution_failed";
      readonly reason: string;
      readonly identityCode:
        | ResolveIdErrorCode
        | "invalid_pointer"
        | "target_not_found";
      readonly scope: string;
      readonly id: string;
      readonly pointers?: ReadonlyArray<Pointer>;
    }
  | {
      readonly ok: false;
      readonly code: "identity_changed";
      readonly reason: string;
      readonly scope: string;
      readonly id: string;
      readonly pointer: Pointer;
    }
  | {
      readonly ok: false;
      readonly code: "target_changed";
      readonly reason: string;
      readonly pointer: Pointer;
      readonly capability: Exclude<JSONCapabilityResult, { ok: true }>;
    }
  | {
      readonly ok: false;
      readonly code: "change_patch_failed";
      readonly reason: string;
      readonly capability: Exclude<JSONCapabilityResult, { ok: true }>;
    };
