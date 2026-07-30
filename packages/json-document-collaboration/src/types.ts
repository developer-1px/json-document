import type {
  JSONAppliedChange,
  JSONCapabilityResult,
  JSONDocument,
  JSONDocumentCommitOptions,
  JSONPatchValidationResult,
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

export interface ReplicaStatus {
  readonly epoch: CollaborationEpoch;
  readonly heads: ReadonlyArray<ChangeId>;
  readonly pending: ReadonlyArray<PendingChange>;
  readonly conflicts: ReadonlyArray<CollaborationConflict>;
  readonly suppressed: ReadonlyArray<SuppressedChange>;
}

/** @deprecated Use ReplicaStatus. */
export type CollaborationSnapshot = ReplicaStatus;

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

export interface CollaborationReplica {
  readonly epoch: CollaborationEpoch;
  status(): ReplicaStatus;
  /** @deprecated Use status. */
  current(): ReplicaStatus;
  exportBundle(): CollaborationBundle;
  exportCheckpoint(): CollaborationCheckpoint;
  ingest(bundle: unknown): CollaborationIngestResult;
  subscribe(listener: (status: ReplicaStatus) => void): () => void;
}

/** @deprecated Use CollaborationReplica. */
export type CollaborationControl = CollaborationReplica;

export interface HistoryStatus {
  readonly undoTarget: ChangeId | null;
  readonly redoTarget: ChangeId | null;
  readonly undoDepth: number;
  readonly redoDepth: number;
  readonly revision: number;
}

/** @deprecated Use HistoryStatus. */
export type CollaborationHistorySnapshot = HistoryStatus;

export type HistoryResult =
  | {
      readonly ok: true;
      readonly changeId: ChangeId;
      readonly target: ChangeId;
      readonly didChangeDocument: boolean;
      /** @deprecated Use didChangeDocument. */
      readonly projectionChanged: boolean;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason?: string;
    };

/** @deprecated Use HistoryResult. */
export type CollaborationHistoryResult = HistoryResult;

export interface History {
  status(): HistoryStatus;
  /** @deprecated Use status. */
  current(): HistoryStatus;
  canUndo(): JSONPatchValidationResult;
  undo(): HistoryResult;
  canRedo(): JSONPatchValidationResult;
  redo(): HistoryResult;
}

/** @deprecated Use History. */
export type CollaborationHistoryControl = History;

export interface CollaborationRuntime {
  readonly document: JSONDocument;
  readonly replica: CollaborationReplica;
  /** @deprecated Use replica. */
  readonly collaboration: CollaborationReplica;
}

export interface HistoryRuntime extends CollaborationRuntime {
  readonly history: History;
}

/** @deprecated Import HistoryRuntime from the /history subpath. */
export type CollaborationHistoryRuntime = HistoryRuntime;

export interface TextSelection {
  readonly anchor: number;
  readonly focus: number;
}

/** @deprecated Use TextSelection from the /text subpath. */
export type CollaborationTextSelection = TextSelection;

export interface TextObservation {
  readonly value: string;
  readonly selection?: TextSelection;
}

/** @deprecated Use TextObservation from the /text subpath. */
export type CollaborationTextObservation = TextObservation;

export interface TextCapture {
  readonly pointer: string;
  readonly target: MemberId;
  readonly textNode: TextNodeId;
  readonly value: string;
}

/** @deprecated Use TextCapture from the /text subpath. */
export type CollaborationTextCapture = TextCapture;

export interface TextPlan {
  readonly pointer: string;
  readonly value: string;
  readonly selection?: TextSelection;
}

/** @deprecated Use TextPlan from the /text subpath. */
export type CollaborationTextPlan = TextPlan;

export type TextCaptureResult =
  | {
      readonly ok: true;
      readonly capture: TextCapture;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };

/** @deprecated Use TextCaptureResult from the /text subpath. */
export type CollaborationTextCaptureResult = TextCaptureResult;

export type TextPlanResult =
  | {
      readonly ok: true;
      readonly plan: TextPlan;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };

/** @deprecated Use TextPlanResult from the /text subpath. */
export type CollaborationTextPlanResult = TextPlanResult;

export type TextCommitResult =
  | {
      readonly ok: true;
      readonly change: JSONAppliedChange;
      readonly changeId: ChangeId | null;
      readonly didChangeDocument: boolean;
      /** @deprecated Use didChangeDocument. */
      readonly projectionChanged: boolean;
      readonly value: string;
      readonly selection: TextSelection | null;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };

/** @deprecated Use TextCommitResult from the /text subpath. */
export type CollaborationTextCommitResult = TextCommitResult;

export interface Text {
  capture(pointer: string): TextCaptureResult;
  plan(
    capture: TextCapture,
    observation: TextObservation,
  ): TextPlanResult;
  commit(
    plan: TextPlan,
    options?: JSONDocumentCommitOptions,
  ): TextCommitResult;
}

/** @deprecated Use Text from the /text subpath. */
export type CollaborationTextControl = Text;

export interface TextRuntime extends HistoryRuntime {
  readonly text: Text;
}

/** @deprecated Use TextRuntime from the /text subpath. */
export type CollaborationTextRuntime = TextRuntime;

/**
 * A convergence-critical validation rule.
 *
 * It must be synchronous, total, side-effect-free, and referentially
 * transparent. Every replica and every invocation must return the same
 * complete result, including code, reason, and pointer, for the same JSON
 * candidate.
 */
export type CollaborationValidation = (
  candidate: JSONValue,
) => JSONPatchValidationResult;

/** @deprecated Use CollaborationValidation. */
export type CollaborationAcceptance = CollaborationValidation;

export interface CollaborationRuntimeOptions {
  readonly actorId: ActorId;
  readonly epochId: string;
  readonly ruleset: CollaborationRulesetIdentity;
  readonly membership?: CollaborationMembership;
  readonly validate?: CollaborationValidation;
  /** @deprecated Use validate. */
  readonly accepts?: CollaborationAcceptance;
}

export interface CollaborationRestoreOptions {
  readonly actorId: ActorId;
  readonly ruleset: CollaborationRulesetIdentity;
  readonly validate?: CollaborationValidation;
  /** @deprecated Use validate. */
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

export type HistoryRestoreResult =
  | {
      readonly ok: true;
      readonly runtime: HistoryRuntime;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };

/** @deprecated Use HistoryRestoreResult from the /history subpath. */
export type CollaborationHistoryRestoreResult = HistoryRestoreResult;

export type TextRestoreResult =
  | {
      readonly ok: true;
      readonly runtime: TextRuntime;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };

/** @deprecated Use TextRestoreResult from the /text subpath. */
export type CollaborationTextRestoreResult = TextRestoreResult;

export interface CollaborationCompactionOptions {
  readonly mode: "new-epoch";
  readonly nextEpochId: string;
  readonly nextRuleset: CollaborationRulesetIdentity;
  /**
   * Omit to preserve the checkpoint membership. Use null to open membership.
   */
  readonly nextMembership?: CollaborationMembership | null;
  readonly validate?: CollaborationValidation;
  /** @deprecated Use validate. */
  readonly accepts?: CollaborationAcceptance;
  readonly nextValidate?: CollaborationValidation;
  /** @deprecated Use nextValidate. */
  readonly nextAccepts?: CollaborationAcceptance;
  readonly verify?: (
    checkpoint: CollaborationCheckpoint,
  ) => JSONCapabilityResult;
}

export interface CollaborationCompactionReport {
  readonly discardedChanges: number;
  readonly discardedConflicts: number;
  readonly discardedSuppressed: number;
  readonly discardedHistoryChanges: number;
  /** @deprecated Use discardedHistoryChanges. */
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
