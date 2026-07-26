import type {
  JSONChangeMetadata,
  JSONDocument,
  JSONPatchOperation,
  JSONResult,
  Pointer,
  SelectionPoint,
} from "@interactive-os/json-document/session";
import type {
  RebaseChangeResult,
  RebaseDiagnostic,
  RebaseSchema,
} from "@interactive-os/json-document-patch-rebase";
import type {
  StableIdRebaseDocument,
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
  /**
   * Inbox-local journal token captured with `base` from `current()` when a
   * host is configured. When present, only later projection batches are
   * replayed. Omit it on the legacy hostless path. A token from another inbox
   * instance is invalid; this is not a transport clock and must already
   * include every declared causal dependency.
   */
  readonly baseRevision?: number;
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly selectionAfter?: SelectionPoint;
}

export interface CausalStableIdReplaceIntent {
  readonly kind: "stable-id-replace";
  readonly target: StableIdTarget;
  readonly relativePath: Pointer;
  readonly expected: unknown;
  readonly value: unknown;
  readonly relativeSelectionAfter?: SelectionPoint;
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

/**
 * Publication port used by direct and positional inbox policies.
 *
 * `value` must return the same immutable reference while the projection is
 * unchanged and a different reference after a concrete publication. `commit`
 * must synchronously notify `subscribe` observers before returning, once for
 * one concrete projection change and zero times for a successful
 * no-op/test-only commit.
 */
export type CausalPatchPublicationDocument<TDocument> = Pick<
  JSONDocument<TDocument>,
  "commit" | "subscribe" | "value"
>;

/** Publication port plus the reads required by stable-id materialization. */
export type CausalPatchDocument<TDocument> =
  CausalPatchPublicationDocument<TDocument>
  & StableIdRebaseDocument<TDocument>;

export interface CausalHostPublication {
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly metadata?: JSONChangeMetadata;
}

export type CausalHostPublicationOwnership =
  | false
  | { readonly sequence: number };

export interface CausalHostReadyRequest {
  readonly id: string;
  /**
   * Scope-bound synchronous application. Call exactly once before `runReady`
   * returns success, or do not call it when returning `host_not_ready`.
   */
  apply(): void;
}

export type CausalHostReadyResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code: "host_not_ready";
      readonly reason: string;
    };

export interface CausalPatchHost {
  /**
   * Classifies a synchronous host-owned publication. This callback must be
   * pure and must not publish another document change. An owned publication
   * returns the monotonic sequence assigned before its commit began; `false`
   * rejects it.
   */
  ownsPublication(
    publication: CausalHostPublication,
  ): CausalHostPublicationOwnership;
  /**
   * Flushes host input and runs one ready envelope in the same call stack.
   * The request cannot be retained for later use.
   */
  runReady(request: CausalHostReadyRequest): CausalHostReadyResult;
}

export interface CausalPatchInboxOptions<TDocument> {
  readonly host?: CausalPatchHost;
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

export type CausalBaseRevisionFailure =
  | {
      readonly ok: false;
      readonly code: "base_revision_ahead";
      readonly reason: string;
      readonly baseRevision: number;
      readonly journalRevision: number;
    }
  | {
      readonly ok: false;
      readonly code: "base_revision_mismatch";
      readonly reason: string;
      readonly baseRevision: number;
      readonly dependency: string;
      readonly dependencyRevision: number;
    };

export type CausalPositionalMaterializationFailure =
  | Exclude<RebaseChangeResult, { ok: true }>
  | CausalBaseRevisionFailure;

export type FailedCausalMaterialization =
  | {
      readonly id: string;
      readonly policy: "positional";
      readonly materialization: CausalPositionalMaterializationFailure;
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
  readonly phase?: "host" | "materialization";
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
  /** Inbox-local projection journal token, exposed only when a host exists. */
  readonly journalRevision?: number;
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
  | "host_not_ready"
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
  | {
      readonly ok: false;
      readonly code: "host_not_ready";
      readonly reason: string;
      readonly id: string;
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
      readonly phase?: "host" | "materialization";
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
