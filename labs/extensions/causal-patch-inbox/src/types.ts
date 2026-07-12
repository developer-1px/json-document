import type {
  JSONPatchOperation,
  JSONResult,
  Pointer,
} from "@interactive-os/json-document";
import type {
  RebaseChangeResult,
  RebaseDiagnostic,
  RebaseSchema,
} from "@interactive-os/json-document-patch-rebase";
import type {
  StableIdRebaseDiagnostic,
  StableIdRebaseResult,
  StableIdReplaceInput,
  StableIdTarget,
} from "@interactive-os/json-document-stable-id-rebase";

export interface CausalPatchEnvelope {
  readonly id: string;
  readonly dependsOn: ReadonlyArray<string>;
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly intent?: never;
}

export interface CausalPositionalIntent<TDocument> {
  readonly kind: "positional";
  readonly base: TDocument;
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly selectionAfter?: Pointer;
}

export interface CausalStableIdReplaceIntent {
  readonly kind: "stable-id-replace";
  readonly target: StableIdTarget;
  readonly relativePath: Pointer;
  readonly expected: unknown;
  readonly value: unknown;
  readonly relativeSelectionAfter?: Pointer;
}

export type CausalAuthoredIntent<TDocument> =
  | CausalPositionalIntent<TDocument>
  | CausalStableIdReplaceIntent;

export interface CausalIntentEnvelope<TDocument> {
  readonly id: string;
  readonly dependsOn: ReadonlyArray<string>;
  readonly intent: CausalAuthoredIntent<TDocument>;
  readonly operations?: never;
}

export type CausalEnvelope<TDocument> =
  | CausalPatchEnvelope
  | CausalIntentEnvelope<TDocument>;

export type CausalMaterializationPolicy =
  | "positional"
  | "stable-id-replace";

export interface CausalPatchInboxOptions<TDocument> {
  readonly positionalSchema?: RebaseSchema<TDocument>;
  readonly stableIdScopes?: StableIdReplaceInput["scopes"];
}

export interface QueuedCausalPatch {
  readonly id: string;
  readonly missing: ReadonlyArray<string>;
}

export interface FailedCausalPatch {
  readonly id: string;
  readonly result: Extract<JSONResult, { ok: false }>;
}

export type FailedCausalMaterialization =
  | {
      readonly id: string;
      readonly policy: "positional";
      readonly materialization: Exclude<RebaseChangeResult, { ok: true }>;
    }
  | {
      readonly id: string;
      readonly policy: "stable-id-replace";
      readonly materialization: Exclude<StableIdRebaseResult, { ok: true }>;
    };

export type CausalPatchFailure =
  | FailedCausalPatch
  | FailedCausalMaterialization;

export interface FaultedCausalPatch {
  readonly id: string;
  readonly reason: string;
  readonly phase?: "materialization";
}

export type CausalMaterializationDiagnostic =
  | ({
      readonly id: string;
      readonly policy: "positional";
    } & RebaseDiagnostic)
  | ({
      readonly id: string;
      readonly policy: "stable-id-replace";
    } & StableIdRebaseDiagnostic);

export interface CausalPatchIngestProgress {
  readonly applied: ReadonlyArray<string>;
  readonly diagnostics?: ReadonlyArray<CausalMaterializationDiagnostic>;
}

export interface CausalPatchInboxSnapshot {
  readonly status: "active" | "blocked" | "diverged" | "faulted" | "disposed";
  readonly frontier: ReadonlyArray<string>;
  readonly queued: ReadonlyArray<QueuedCausalPatch>;
  readonly failure?: CausalPatchFailure;
  readonly fault?: FaultedCausalPatch;
}

export interface CausalPatchIngestOk extends CausalPatchIngestProgress {
  readonly ok: true;
  readonly pending: ReadonlyArray<string>;
  readonly duplicates: ReadonlyArray<string>;
}

export type CausalPatchIngestErrorCode =
  | "invalid_envelope"
  | "duplicate_mismatch"
  | "dependency_cycle"
  | "policy_not_configured"
  | "materialization_failed"
  | "patch_failed"
  | "blocked"
  | "projection_diverged"
  | "faulted"
  | "busy"
  | "disposed";

export type CausalPatchIngestError = CausalPatchIngestProgress & (
  | {
      readonly ok: false;
      readonly code: "invalid_envelope";
      readonly reason: string;
      readonly id?: string;
    }
  | {
      readonly ok: false;
      readonly code: "duplicate_mismatch";
      readonly reason: string;
      readonly id: string;
    }
  | {
      readonly ok: false;
      readonly code: "dependency_cycle";
      readonly reason: string;
      readonly id: string;
      readonly cycle: ReadonlyArray<string>;
    }
  | {
      readonly ok: false;
      readonly code: "policy_not_configured";
      readonly reason: string;
      readonly id: string;
      readonly policy: CausalMaterializationPolicy;
    }
  | ({
      readonly ok: false;
      readonly code: "materialization_failed" | "blocked";
      readonly reason: string;
    } & FailedCausalMaterialization)
  | {
      readonly ok: false;
      readonly code: "patch_failed" | "blocked";
      readonly reason: string;
      readonly id: string;
      readonly result: Extract<JSONResult, { ok: false }>;
    }
  | {
      readonly ok: false;
      readonly code: "projection_diverged" | "busy" | "disposed";
      readonly reason: string;
    }
  | {
      readonly ok: false;
      readonly code: "faulted";
      readonly reason: string;
      readonly id: string;
      readonly phase?: "materialization";
    }
);

export type CausalPatchIngestResult =
  | CausalPatchIngestOk
  | CausalPatchIngestError;

export interface CausalPatchInbox<TDocument = unknown> {
  ingest(
    input: CausalEnvelope<TDocument> | ReadonlyArray<CausalEnvelope<TDocument>>,
  ): CausalPatchIngestResult;
  current(): CausalPatchInboxSnapshot;
  dispose(): void;
}
