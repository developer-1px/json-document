# @interactive-os/json-document-collaboration API

**Owner:** Collaboration

replica, history, text collaboration runtime의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-collaboration/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `ActorId`

```ts
type ActorId = string;
```
## `ArrayPlacement`

```ts
type ArrayPlacement = {
  readonly kind: "array";
  readonly after: PositionId | null;
  readonly before: PositionId | null;
};
```
## `ChangeId`

```ts
interface ChangeId {
  readonly actorId: ActorId;
  readonly counter: number;
}
```
## `CollaborationBundle`

```ts
interface CollaborationBundle {
  readonly epoch: CollaborationEpoch;
  readonly changes: ReadonlyArray<CollaborationChange>;
}
```
## `CollaborationChange`

```ts
interface CollaborationChange {
  readonly changeId: ChangeId;
  readonly deps: ReadonlyArray<ChangeId>;
  readonly ops: ReadonlyArray<SemanticOperation>;
}
```
## `CollaborationCheckpoint`

```ts
interface CollaborationCheckpoint {
  readonly payload: CollaborationCheckpointPayload;
  readonly integrity: {
    readonly algorithm: "sha-256";
    readonly digest: string;
    readonly proof?: string;
    readonly keyId?: string;
  };
}
```
## `CollaborationCheckpointPayload`

```ts
interface CollaborationCheckpointPayload {
  readonly kind: "json-document-collaboration/checkpoint";
  readonly version: 1;
  readonly epoch: CollaborationEpoch;
  readonly base: JSONValue;
  readonly membership: CollaborationMembership | null;
  readonly changes: ReadonlyArray<CollaborationChange>;
}
```
## `CollaborationCompactionOptions`

```ts
interface CollaborationCompactionOptions {
  readonly mode: "new-epoch";
  readonly nextEpochId: string;
  readonly nextRuleset: CollaborationRulesetIdentity;
  /**
   * Omit to preserve the checkpoint membership. Use null to open membership.
   */
  readonly nextMembership?: CollaborationMembership | null;
  readonly validate?: CollaborationValidation;
  readonly nextValidate?: CollaborationValidation;
  readonly verify?: (
    checkpoint: CollaborationCheckpoint,
  ) => JSONPatchValidationResult;
}
```
## `CollaborationCompactionReport`

```ts
interface CollaborationCompactionReport {
  readonly discardedChanges: number;
  readonly discardedConflicts: number;
  readonly discardedSuppressed: number;
  readonly discardedHistoryChanges: number;
}
```
## `CollaborationCompactionResult`

```ts
type CollaborationCompactionResult =
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
```
## `CollaborationConflict`

```ts
type CollaborationConflict =
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
```
## `CollaborationEpoch`

```ts
interface CollaborationEpoch {
  readonly protocolVersion: 3;
  readonly epochId: string;
  readonly ruleset: CollaborationRulesetIdentity;
  readonly acceptance: "none" | "custom";
  readonly baseDigest: string;
  readonly membershipDigest: string;
  readonly parent: CollaborationEpochParent | null;
}
```
## `CollaborationEpochParent`

```ts
interface CollaborationEpochParent {
  readonly epochId: string;
  readonly checkpointDigest: string;
}
```
## `CollaborationIngestFailure`

```ts
interface CollaborationIngestFailure {
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
```
## `CollaborationIngestResult`

```ts
type CollaborationIngestResult =
  | CollaborationIngestSuccess
  | CollaborationIngestFailure;
```
## `CollaborationIngestSuccess`

```ts
interface CollaborationIngestSuccess {
  readonly ok: true;
  readonly integrated: ReadonlyArray<ChangeId>;
  readonly pending: ReadonlyArray<ChangeId>;
  readonly duplicates: ReadonlyArray<ChangeId>;
}
```
## `CollaborationMember`

```ts
interface CollaborationMember {
  readonly actorId: ActorId;
  readonly credentialId?: string;
}
```
## `CollaborationMembership`

```ts
interface CollaborationMembership {
  readonly version: 1;
  readonly members: ReadonlyArray<CollaborationMember>;
}
```
## `CollaborationReplica`

```ts
interface CollaborationReplica {
  readonly epoch: CollaborationEpoch;
  status(): ReplicaStatus;
  exportBundle(): CollaborationBundle;
  exportCheckpoint(): CollaborationCheckpoint;
  ingest(bundle: unknown): CollaborationIngestResult;
  subscribe(listener: (status: ReplicaStatus) => void): () => void;
}
```
## `CollaborationRestoreOptions`

```ts
interface CollaborationRestoreOptions {
  readonly actorId: ActorId;
  readonly ruleset: CollaborationRulesetIdentity;
  readonly validate?: CollaborationValidation;
  readonly verify?: (
    checkpoint: CollaborationCheckpoint,
  ) => JSONPatchValidationResult;
}
```
## `CollaborationRestoreResult`

```ts
type CollaborationRestoreResult =
  | {
      readonly ok: true;
      readonly runtime: CollaborationRuntime;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };
```
## `CollaborationRulesetIdentity`

```ts
interface CollaborationRulesetIdentity {
  readonly id: string;
  readonly digest: string;
}
```
## `CollaborationRuntime`

```ts
interface CollaborationRuntime {
  readonly document: JSONDocument;
  readonly replica: CollaborationReplica;
}
```
## `CollaborationRuntimeOptions`

```ts
interface CollaborationRuntimeOptions {
  readonly actorId: ActorId;
  readonly epochId: string;
  readonly ruleset: CollaborationRulesetIdentity;
  readonly membership?: CollaborationMembership;
  readonly validate?: CollaborationValidation;
}
```
## `CollaborationValidation`

```ts
type CollaborationValidation = (
  candidate: JSONValue,
) => JSONPatchValidationResult;
```
## `compactCollaborationCheckpoint`

```ts
compactCollaborationCheckpoint(input: unknown, options: CollaborationCompactionOptions): CollaborationCompactionResult
```
## `ContainerNodeId`

```ts
type ContainerNodeId = string;
```
## `createCollaborationRuntime`

```ts
createCollaborationRuntime(initial: unknown, options: CollaborationRuntimeOptions): CollaborationRuntime
```
## `MemberId`

```ts
type MemberId = string;
```
## `MemberPlacement`

```ts
type MemberPlacement = ObjectPlacement | ArrayPlacement;
```
## `ObjectPlacement`

```ts
type ObjectPlacement = {
  readonly kind: "object";
  readonly key: string;
};
```
## `PendingChange`

```ts
interface PendingChange {
  readonly changeId: ChangeId;
  readonly missing: ReadonlyArray<ChangeId>;
}
```
## `PositionId`

```ts
type PositionId = string;
```
## `ReplicaStatus`

```ts
interface ReplicaStatus {
  readonly epoch: CollaborationEpoch;
  readonly heads: ReadonlyArray<ChangeId>;
  readonly pending: ReadonlyArray<PendingChange>;
  readonly conflicts: ReadonlyArray<CollaborationConflict>;
  readonly suppressed: ReadonlyArray<SuppressedChange>;
}
```
## `restoreCollaborationRuntime`

```ts
restoreCollaborationRuntime(input: unknown, options: CollaborationRestoreOptions): CollaborationRestoreResult
```
## `SemanticOperation`

```ts
type SemanticOperation =
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
```
## `SuppressedChange`

```ts
interface SuppressedChange {
  readonly changeId: ChangeId;
  readonly code: string;
  readonly reason?: string;
  readonly pointer?: string;
}
```
## `TextAtomId`

```ts
type TextAtomId = string;
```
## `TextNodeId`

```ts
type TextNodeId = string;
```
## `TextSpliceOperation`

```ts
interface TextSpliceOperation {
  readonly kind: "text-splice";
  readonly target: MemberId;
  readonly textNode: TextNodeId;
  readonly left: TextAtomId | null;
  readonly right: TextAtomId | null;
  readonly removed: ReadonlyArray<TextAtomId>;
  readonly inserted: string;
}
```
