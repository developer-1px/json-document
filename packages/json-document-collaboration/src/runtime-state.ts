import {
  createJSONDocument,
  type JSONAppliedChange,
  type JSONDocument,
  type JSONDocumentCommitResult,
  type JSONPatchValidationResult,
  type JSONValue,
} from "@interactive-os/json-document";

import {
  canonicalMembership,
  canonicalStringify,
  createEpoch,
  freezeChangeId,
  membershipAllows,
  prepareGraph,
  validateOptions,
  type PreparedGraph,
} from "./change.js";
import {
  validateCandidate,
  materializeTree,
  type MaterializedDocument,
} from "./materialize.js";
import {
  createInitialTree,
  projectTree,
  type TreeState,
} from "./tree.js";
import type { TextAtomSnapshot } from "./text-core.js";
import type { TextSelectionGap } from "./text-selection.js";
import type {
  ChangeId,
  CollaborationChange,
  CollaborationConflict,
  CollaborationEpoch,
  CollaborationMembership,
  CollaborationRuntimeOptions,
  PendingChange,
  ReplicaStatus,
  SuppressedChange,
  TextCapture,
  TextPlan,
  TextSpliceOperation,
} from "./types.js";

export type RuntimeProfile = "atomic" | "text";

export interface NotificationEvent {
  readonly documentChange?: JSONAppliedChange;
  readonly replicaStatus: ReplicaStatus;
}

export interface TextCaptureState {
  readonly capture: TextCapture;
  readonly atoms: ReadonlyArray<TextAtomSnapshot>;
  readonly deps: ReadonlyArray<ChangeId>;
  readonly actorCounter: number;
}

export interface TextPlanState {
  readonly plan: TextPlan;
  readonly capture: TextCaptureState;
  readonly operation: TextSpliceOperation | null;
  readonly graphRevision: number;
  readonly anchorGap: TextSelectionGap | null;
  readonly focusGap: TextSelectionGap | null;
}

export interface RuntimeState {
  readonly actorId: string;
  readonly epoch: CollaborationEpoch;
  readonly membership: CollaborationMembership | null;
  readonly profile: RuntimeProfile;
  readonly initialValue: JSONValue;
  readonly initialTree: TreeState;
  readonly documentStore: JSONDocument;
  evaluatingValidation: boolean;
  localCounter: number;
  known: Map<string, CollaborationChange>;
  graph: PreparedGraph;
  materialized: MaterializedDocument;
  graphRevision: number;
  readonly textCaptures: WeakMap<TextCapture, TextCaptureState>;
  readonly textPlans: WeakMap<TextPlan, TextPlanState>;
  evaluateValidation(candidate: JSONValue): JSONPatchValidationResult;
  replicaStatus(): ReplicaStatus;
  notify(event: NotificationEvent): void;
  subscribeDocument(listener: (change: JSONAppliedChange) => void): () => void;
  subscribeReplica(listener: (status: ReplicaStatus) => void): () => void;
}

export function createRuntimeState(
  initial: unknown,
  options: CollaborationRuntimeOptions,
  expectedEpoch?: CollaborationEpoch,
  profile: RuntimeProfile = "atomic",
): RuntimeState {
  validateOptions(options);

  const validated = createJSONDocument(initial);
  const initialValue = validated.value;
  const membership = canonicalMembership(options.membership);
  if (!membershipAllows(membership, options.actorId)) {
    throw new TypeError("actorId is not admitted by this epoch membership");
  }
  const epoch = createEpoch(
    initialValue,
    options,
    expectedEpoch?.parent ?? null,
  );
  if (
    expectedEpoch !== undefined
    && canonicalStringify(epoch as unknown as JSONValue)
      !== canonicalStringify(expectedEpoch as unknown as JSONValue)
  ) {
    throw new TypeError("restored epoch does not match the checkpoint");
  }
  const initialTree = createInitialTree(
    initialValue,
    epoch.baseDigest,
  );
  const initialProjected = projectTree(initialTree, () => false);
  if (!initialProjected.ok) {
    throw new TypeError(`Initial collaboration tree is invalid: ${initialProjected.reason}`);
  }

  const reentrancy = { current: false };
  const validate = options.validate;
  const evaluateValidation = (
    candidate: JSONValue,
  ): JSONPatchValidationResult => {
    if (reentrancy.current) return ACCEPTANCE_REENTRANCY_FAILURE;
    reentrancy.current = true;
    try {
      return validateCandidate(validate, candidate);
    } finally {
      reentrancy.current = false;
    }
  };
  const initialValidation = evaluateValidation(initialProjected.value);
  if (!initialValidation.ok) {
    throw new TypeError(
      `Initial document value was rejected: ${initialValidation.reason ?? initialValidation.code}`,
    );
  }

  const documentListeners = new Set<(change: JSONAppliedChange) => void>();
  const replicaStatusListeners = new Set<(status: ReplicaStatus) => void>();
  const notificationQueue: NotificationEvent[] = [];
  let notifying = false;

  const state: RuntimeState = {
    actorId: options.actorId,
    epoch,
    membership,
    profile,
    initialValue,
    initialTree,
    documentStore: createJSONDocument(initialProjected.value),
    get evaluatingValidation() {
      return reentrancy.current;
    },
    set evaluatingValidation(value: boolean) {
      reentrancy.current = value;
    },
    localCounter: 0,
    known: new Map<string, CollaborationChange>(),
    graph: prepareGraph(new Map()),
    materialized: materializeTree(initialTree, [], Object.freeze([])),
    graphRevision: 0,
    textCaptures: new WeakMap<TextCapture, TextCaptureState>(),
    textPlans: new WeakMap<TextPlan, TextPlanState>(),
    evaluateValidation,
    replicaStatus() {
      return Object.freeze({
        epoch: state.epoch,
        heads: state.graph.heads,
        pending: freezePending(state.graph.pending),
        conflicts: freezeConflicts(state.materialized.conflicts),
        suppressed: freezeSuppressed(state.materialized.suppressed),
      });
    },
    notify(event) {
      notificationQueue.push(event);
      if (notifying) return;
      notifying = true;
      try {
        while (notificationQueue.length > 0) {
          const next = notificationQueue.shift() as NotificationEvent;
          if (next.documentChange !== undefined) {
            for (const listener of [...documentListeners]) {
              if (!documentListeners.has(listener)) continue;
              try {
                listener(next.documentChange);
              } catch {
                // Notification follows a committed state change. A listener
                // failure cannot turn that write into an apparent failure or
                // prevent delivery to the remaining active listeners.
              }
            }
          }
          for (const listener of [...replicaStatusListeners]) {
            if (!replicaStatusListeners.has(listener)) continue;
            try {
              listener(next.replicaStatus);
            } catch {
              // Replica status follows committed causal state and uses the same
              // failure-isolation rule as JSON Document notifications.
            }
          }
        }
      } finally {
        notifying = false;
      }
    },
    subscribeDocument(listener) {
      documentListeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        documentListeners.delete(listener);
      };
    },
    subscribeReplica(listener) {
      replicaStatusListeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        replicaStatusListeners.delete(listener);
      };
    },
  };

  return state;
}

export function failure(
  code: string,
  reason?: string,
): Extract<JSONDocumentCommitResult, { readonly ok: false }> {
  return Object.freeze({
    ok: false,
    code,
    ...(reason === undefined ? {} : { reason }),
  });
}

export const OK: JSONPatchValidationResult = Object.freeze({ ok: true });
export const ACCEPTANCE_REENTRANCY_FAILURE = failure(
  "acceptance_reentrancy",
  "validation callback cannot call validatePatch or commit",
);

function freezePending(
  pending: ReadonlyArray<PendingChange>,
): ReadonlyArray<PendingChange> {
  return Object.freeze(pending.map((row) => Object.freeze({
    changeId: freezeChangeId(row.changeId),
    missing: Object.freeze(row.missing.map(freezeChangeId)),
  })));
}

function freezeConflicts(
  conflicts: ReadonlyArray<CollaborationConflict>,
): ReadonlyArray<CollaborationConflict> {
  return Object.freeze([...conflicts]);
}

function freezeSuppressed(
  suppressed: ReadonlyArray<SuppressedChange>,
): ReadonlyArray<SuppressedChange> {
  return Object.freeze([...suppressed]);
}
