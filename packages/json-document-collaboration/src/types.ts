import type {
  JSONCapabilityResult,
  JSONDocument,
  JSONValue,
} from "@interactive-os/json-document";

export type ActorId = string;
export type MemberId = string;
export type ContainerNodeId = string;
export type PositionId = string;
export type TextNodeId = string;
export type TextAtomId = string;

export interface ChangeId {
  readonly actorId: ActorId;
  readonly counter: number;
}

export interface CollaborationRulesetIdentity {
  readonly id: string;
  readonly digest: string;
}

export interface CollaborationMember {
  readonly actorId: ActorId;
  readonly credentialId?: string;
}

export interface CollaborationMembership {
  readonly version: 1;
  readonly members: ReadonlyArray<CollaborationMember>;
}

export interface CollaborationEpochParent {
  readonly epochId: string;
  readonly checkpointDigest: string;
}

export interface CollaborationEpoch {
  readonly protocolVersion: 3;
  readonly epochId: string;
  readonly ruleset: CollaborationRulesetIdentity;
  readonly acceptance: "none" | "custom";
  readonly baseDigest: string;
  readonly membershipDigest: string;
  readonly parent: CollaborationEpochParent | null;
}

export type ObjectPlacement = {
  readonly kind: "object";
  readonly key: string;
};

export type ArrayPlacement = {
  readonly kind: "array";
  readonly after: PositionId | null;
  readonly before: PositionId | null;
};

export type MemberPlacement = ObjectPlacement | ArrayPlacement;

export type SemanticOperation =
  | {
      readonly kind: "test";
      readonly target: MemberId;
      readonly expected: JSONValue;
    }
  | {
      readonly kind: "set";
      readonly target: MemberId;
      readonly value: JSONValue;
    }
  | {
      readonly kind: "insert";
      readonly parent: ContainerNodeId;
      readonly member: MemberId;
      readonly placement: MemberPlacement;
      readonly value: JSONValue;
    }
  | {
      readonly kind: "remove";
      readonly target: MemberId;
    }
  | {
      readonly kind: "move";
      readonly target: MemberId;
      readonly parent: ContainerNodeId;
      readonly placement: MemberPlacement;
      readonly replaced?: MemberId;
    }
  | {
      readonly kind: "move-to-root";
      readonly source: MemberId;
      readonly root: MemberId;
    }
  | TextSpliceOperation
  | {
      readonly kind: "undo-change";
      readonly target: ChangeId;
    }
  | {
      readonly kind: "redo-change";
      readonly undo: ChangeId;
    };

export interface TextSpliceOperation {
  readonly kind: "text-splice";
  readonly target: MemberId;
  readonly textNode: TextNodeId;
  readonly left: TextAtomId | null;
  readonly right: TextAtomId | null;
  readonly removed: ReadonlyArray<TextAtomId>;
  readonly inserted: string;
}

export interface CollaborationChange {
  readonly changeId: ChangeId;
  readonly deps: ReadonlyArray<ChangeId>;
  readonly ops: ReadonlyArray<SemanticOperation>;
}

export interface CollaborationBundle {
  readonly epoch: CollaborationEpoch;
  readonly changes: ReadonlyArray<CollaborationChange>;
}

export interface CollaborationCheckpointPayload {
  readonly kind: "json-document-collaboration/checkpoint";
  readonly version: 1;
  readonly epoch: CollaborationEpoch;
  readonly base: JSONValue;
  readonly membership: CollaborationMembership | null;
  readonly changes: ReadonlyArray<CollaborationChange>;
}

export interface CollaborationCheckpoint {
  readonly payload: CollaborationCheckpointPayload;
  readonly integrity: {
    readonly algorithm: "sha-256";
    readonly digest: string;
    readonly proof?: string;
    readonly keyId?: string;
  };
}

export type CollaborationConflict =
  | {
      readonly kind: "object-key";
      readonly containerId: ContainerNodeId;
      readonly key: string;
      readonly winner: MemberId;
      readonly alternatives: ReadonlyArray<MemberId>;
    }
  | {
      readonly kind: "member-value";
      readonly memberId: MemberId;
      readonly winner: ChangeId;
      readonly alternatives: ReadonlyArray<ChangeId>;
    }
  | {
      readonly kind: "member-placement";
      readonly memberId: MemberId;
      readonly winner: ChangeId;
      readonly alternatives: ReadonlyArray<ChangeId>;
    };

export interface SuppressedChange {
  readonly changeId: ChangeId;
  readonly code: string;
  readonly reason?: string;
  readonly pointer?: string;
}

export interface PendingChange {
  readonly changeId: ChangeId;
  readonly missing: ReadonlyArray<ChangeId>;
}

export interface CollaborationSnapshot {
  readonly epoch: CollaborationEpoch;
  readonly heads: ReadonlyArray<ChangeId>;
  readonly pending: ReadonlyArray<PendingChange>;
  readonly conflicts: ReadonlyArray<CollaborationConflict>;
  readonly suppressed: ReadonlyArray<SuppressedChange>;
}

export interface CollaborationIngestSuccess {
  readonly ok: true;
  readonly integrated: ReadonlyArray<ChangeId>;
  readonly pending: ReadonlyArray<ChangeId>;
  readonly duplicates: ReadonlyArray<ChangeId>;
}

export interface CollaborationIngestFailure {
  readonly ok: false;
  readonly code:
    | "invalid_bundle"
    | "epoch_mismatch"
    | "ruleset_mismatch"
    | "checkpoint_mismatch"
    | "membership_mismatch"
    | "duplicate_mismatch"
    | "dependency_cycle"
    | "actor_fork"
    | "membership_violation"
    | "acceptance_reentrancy";
  readonly reason: string;
  readonly changeId?: ChangeId;
}

export type CollaborationIngestResult =
  | CollaborationIngestSuccess
  | CollaborationIngestFailure;

export interface CollaborationControl {
  readonly epoch: CollaborationEpoch;
  current(): CollaborationSnapshot;
  exportBundle(): CollaborationBundle;
  exportCheckpoint(): CollaborationCheckpoint;
  ingest(bundle: unknown): CollaborationIngestResult;
  subscribe(listener: (snapshot: CollaborationSnapshot) => void): () => void;
}

export interface CollaborationHistorySnapshot {
  readonly undoTarget: ChangeId | null;
  readonly redoTarget: ChangeId | null;
}

export type CollaborationHistoryResult =
  | {
      readonly ok: true;
      readonly changeId: ChangeId;
      readonly target: ChangeId;
      readonly projectionChanged: boolean;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason?: string;
    };

export interface CollaborationHistoryControl {
  current(): CollaborationHistorySnapshot;
  canUndo(): JSONCapabilityResult;
  undo(): CollaborationHistoryResult;
  canRedo(): JSONCapabilityResult;
  redo(): CollaborationHistoryResult;
}

export interface CollaborationRuntime {
  readonly document: JSONDocument;
  readonly collaboration: CollaborationControl;
}

export interface CollaborationHistoryRuntime extends CollaborationRuntime {
  readonly history: CollaborationHistoryControl;
}

export interface CollaborationTextSelection {
  readonly anchor: number;
  readonly focus: number;
}

export interface CollaborationTextObservation {
  readonly value: string;
  readonly selection?: CollaborationTextSelection;
}

export interface CollaborationTextCapture {
  readonly pointer: string;
  readonly target: MemberId;
  readonly textNode: TextNodeId;
  readonly value: string;
}

export interface CollaborationTextPlan {
  readonly pointer: string;
  readonly value: string;
  readonly selection?: CollaborationTextSelection;
}

export type CollaborationTextCaptureResult =
  | {
      readonly ok: true;
      readonly capture: CollaborationTextCapture;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };

export type CollaborationTextPlanResult =
  | {
      readonly ok: true;
      readonly plan: CollaborationTextPlan;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };

export type CollaborationTextCommitResult =
  | {
      readonly ok: true;
      readonly changeId: ChangeId | null;
      readonly projectionChanged: boolean;
      readonly value: string;
      readonly selection: CollaborationTextSelection | null;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };

export interface CollaborationTextControl {
  capture(pointer: string): CollaborationTextCaptureResult;
  plan(
    capture: CollaborationTextCapture,
    observation: CollaborationTextObservation,
  ): CollaborationTextPlanResult;
  commit(plan: CollaborationTextPlan): CollaborationTextCommitResult;
}

export interface CollaborationTextRuntime extends CollaborationRuntime {
  readonly text: CollaborationTextControl;
}

/**
 * A convergence-critical acceptance rule.
 *
 * It must be synchronous, total, side-effect-free, and referentially
 * transparent. Every replica and every invocation must return the same
 * complete result, including code, reason, and pointer, for the same JSON
 * candidate.
 */
export type CollaborationAcceptance = (
  candidate: JSONValue,
) => JSONCapabilityResult;

export interface CollaborationRuntimeOptions {
  readonly actorId: ActorId;
  readonly epochId: string;
  readonly ruleset: CollaborationRulesetIdentity;
  readonly membership?: CollaborationMembership;
  readonly accepts?: CollaborationAcceptance;
}

export interface CollaborationRestoreOptions {
  readonly actorId: ActorId;
  readonly ruleset: CollaborationRulesetIdentity;
  readonly accepts?: CollaborationAcceptance;
  readonly verify?: (
    checkpoint: CollaborationCheckpoint,
  ) => JSONCapabilityResult;
}

export type CollaborationRestoreResult =
  | {
      readonly ok: true;
      readonly runtime: CollaborationRuntime;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };

export type CollaborationHistoryRestoreResult =
  | {
      readonly ok: true;
      readonly runtime: CollaborationHistoryRuntime;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };

export type CollaborationTextRestoreResult =
  | {
      readonly ok: true;
      readonly runtime: CollaborationTextRuntime;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };

export interface CollaborationCompactionOptions {
  readonly mode: "new-epoch";
  readonly nextEpochId: string;
  readonly nextRuleset: CollaborationRulesetIdentity;
  /**
   * Omit to preserve the checkpoint membership. Use null to open membership.
   */
  readonly nextMembership?: CollaborationMembership | null;
  readonly accepts?: CollaborationAcceptance;
  readonly nextAccepts?: CollaborationAcceptance;
  readonly verify?: (
    checkpoint: CollaborationCheckpoint,
  ) => JSONCapabilityResult;
}

export interface CollaborationCompactionReport {
  readonly discardedChanges: number;
  readonly discardedConflicts: number;
  readonly discardedSuppressed: number;
  readonly discardedHistoryControls: number;
}

export type CollaborationCompactionResult =
  | {
      readonly ok: true;
      readonly checkpoint: CollaborationCheckpoint;
      readonly report: CollaborationCompactionReport;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };
