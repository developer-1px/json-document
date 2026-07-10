import type {
  JSONPatchOperation,
  JSONResult,
} from "@interactive-os/json-document";

export interface CausalPatchEnvelope {
  readonly id: string;
  readonly dependsOn: ReadonlyArray<string>;
  readonly operations: ReadonlyArray<JSONPatchOperation>;
}

export interface QueuedCausalPatch {
  readonly id: string;
  readonly missing: ReadonlyArray<string>;
}

export interface FailedCausalPatch {
  readonly id: string;
  readonly result: Extract<JSONResult, { ok: false }>;
}

export interface FaultedCausalPatch {
  readonly id: string;
  readonly reason: string;
}

export interface CausalPatchInboxSnapshot {
  readonly status: "active" | "blocked" | "diverged" | "faulted" | "disposed";
  readonly frontier: ReadonlyArray<string>;
  readonly queued: ReadonlyArray<QueuedCausalPatch>;
  readonly failure?: FailedCausalPatch;
  readonly fault?: FaultedCausalPatch;
}

export interface CausalPatchIngestOk {
  readonly ok: true;
  readonly applied: ReadonlyArray<string>;
  readonly pending: ReadonlyArray<string>;
  readonly duplicates: ReadonlyArray<string>;
}

export type CausalPatchIngestErrorCode =
  | "invalid_envelope"
  | "duplicate_mismatch"
  | "dependency_cycle"
  | "patch_failed"
  | "blocked"
  | "projection_diverged"
  | "faulted"
  | "busy"
  | "disposed";

export type CausalPatchIngestError =
  | {
      readonly ok: false;
      readonly code: "invalid_envelope";
      readonly reason: string;
      readonly applied: ReadonlyArray<string>;
      readonly id?: string;
    }
  | {
      readonly ok: false;
      readonly code: "duplicate_mismatch";
      readonly reason: string;
      readonly applied: ReadonlyArray<string>;
      readonly id: string;
    }
  | {
      readonly ok: false;
      readonly code: "dependency_cycle";
      readonly reason: string;
      readonly applied: ReadonlyArray<string>;
      readonly id: string;
      readonly cycle: ReadonlyArray<string>;
    }
  | {
      readonly ok: false;
      readonly code: "patch_failed" | "blocked";
      readonly reason: string;
      readonly applied: ReadonlyArray<string>;
      readonly id: string;
      readonly result: Extract<JSONResult, { ok: false }>;
    }
  | {
      readonly ok: false;
      readonly code: "projection_diverged" | "busy" | "disposed";
      readonly reason: string;
      readonly applied: ReadonlyArray<string>;
    }
  | {
      readonly ok: false;
      readonly code: "faulted";
      readonly reason: string;
      readonly applied: ReadonlyArray<string>;
      readonly id: string;
    };

export type CausalPatchIngestResult =
  | CausalPatchIngestOk
  | CausalPatchIngestError;

export interface CausalPatchInbox {
  ingest(
    input: CausalPatchEnvelope | ReadonlyArray<CausalPatchEnvelope>,
  ): CausalPatchIngestResult;
  current(): CausalPatchInboxSnapshot;
  dispose(): void;
}
