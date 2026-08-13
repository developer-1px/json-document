import {
  applyPatch,
  createJSONDocument,
  parsePointer,
  type JSONAppliedChange,
  type JSONPatchValidationResult,
  type JSONDocument,
  type JSONDocumentCommitOptions,
  type JSONDocumentCommitResult,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";

import {
  authorDependencies,
  canonicalMembership,
  canonicalStringify,
  checkEpoch,
  changeIdKey,
  changesEqual,
  compareChangeIds,
  compareChanges,
  createEpoch,
  findActorDependencyFork,
  findActorFork,
  freezeChangeId,
  freezeLocalChange,
  graphCycle,
  membershipAllows,
  prepareBundle,
  prepareGraph,
  unauthorizedChange,
  validateOptions,
  type PreparedGraph,
} from "./change.js";
import { jsonEqual } from "./json-equal.js";
import { createCheckpoint } from "./checkpoint.js";
import {
  validateCandidate,
  historyOperationFor,
  isUndoableChange,
  materializeChanges,
  materializeTree,
  type MaterializedDocument,
} from "./materialize.js";
import {
  createInitialTree,
  projectTree,
  resolveTextMemberSnapshot,
  resolveTextSnapshot,
} from "./tree.js";
import {
  createMinimalTextSplice,
  projectText,
  type TextAtomSnapshot,
} from "./text-core.js";
import {
  observedTextAtomIds,
  prepareTextSelection,
  resolvePlannedSelection,
  textFailure,
  textSelectionGap,
  type TextSelectionGap,
} from "./text-selection.js";
import { compilePatchOperations } from "./translate.js";
import type {
  ChangeId,
  CollaborationBundle,
  CollaborationChange,
  CollaborationConflict,
  CollaborationReplica,
  CollaborationEpoch,
  History,
  HistoryResult,
  HistoryRuntime,
  HistoryStatus,
  CollaborationIngestResult,
  CollaborationRuntime,
  CollaborationRuntimeOptions,
  ReplicaStatus,
  CollaborationMembership,
  TextCapture,
  Text,
  TextCommitResult,
  TextObservation,
  TextPlan,
  TextPlanResult,
  TextRuntime,
  PendingChange,
  SuppressedChange,
  TextSpliceOperation,
} from "./types.js";

interface PreparedLocalChange {
  readonly patchValue: JSONValue;
  readonly change: CollaborationChange | null;
  readonly known: ReadonlyMap<string, CollaborationChange>;
  readonly graph: PreparedGraph;
  readonly materialized: MaterializedDocument;
}

type PreparedLocalResult =
  | { readonly ok: true; readonly value: PreparedLocalChange }
  | Extract<JSONDocumentCommitResult, { readonly ok: false }>;

interface NotificationEvent {
  readonly documentChange?: JSONAppliedChange;
  readonly replicaStatus: ReplicaStatus;
}

interface PreparedHistoryChange {
  readonly change: CollaborationChange;
  readonly target: ChangeId;
  readonly known: ReadonlyMap<string, CollaborationChange>;
  readonly graph: PreparedGraph;
  readonly materialized: MaterializedDocument;
  readonly didChangeDocument: boolean;
}

type PreparedHistoryResult =
  | { readonly ok: true; readonly value: PreparedHistoryChange }
  | Extract<HistoryResult, { readonly ok: false }>;

interface ResolvedHistoryState {
  readonly status: HistoryStatus;
  readonly effectiveUndo: ChangeId | null;
}

interface InternalRuntime extends HistoryRuntime {
  readonly text?: Text;
}

interface TextCaptureState {
  readonly capture: TextCapture;
  readonly atoms: ReadonlyArray<TextAtomSnapshot>;
  readonly deps: ReadonlyArray<ChangeId>;
  readonly actorCounter: number;
}

interface TextPlanState {
  readonly plan: TextPlan;
  readonly capture: TextCaptureState;
  readonly operation: TextSpliceOperation | null;
  readonly graphRevision: number;
  readonly anchorGap: TextSelectionGap | null;
  readonly focusGap: TextSelectionGap | null;
}

export function createCollaborationRuntime(
  initial: unknown,
  options: CollaborationRuntimeOptions,
): CollaborationRuntime {
  const runtime = createRuntime(initial, options);
  return Object.freeze({
    document: runtime.document,
    replica: runtime.replica,
  });
}

export function createTextRuntime(
  initial: unknown,
  options: CollaborationRuntimeOptions,
): TextRuntime {
  const runtime = createRuntime(initial, options, undefined, "text");
  if (runtime.text === undefined) {
    throw new Error("collaborative text profile was not initialized");
  }
  return Object.freeze({
    document: runtime.document,
    replica: runtime.replica,
    history: runtime.history,
    text: runtime.text,
  });
}

export function createHistoryRuntime(
  initial: unknown,
  options: CollaborationRuntimeOptions,
): HistoryRuntime {
  return createRuntime(initial, options);
}

export function createRestoredRuntime(
  initial: unknown,
  options: CollaborationRuntimeOptions,
  expectedEpoch: CollaborationEpoch,
): HistoryRuntime {
  return createRuntime(initial, options, expectedEpoch);
}

export function createRestoredTextRuntime(
  initial: unknown,
  options: CollaborationRuntimeOptions,
  expectedEpoch: CollaborationEpoch,
): TextRuntime {
  const runtime = createRuntime(initial, options, expectedEpoch, "text");
  if (runtime.text === undefined) {
    throw new Error("collaborative text profile was not initialized");
  }
  return Object.freeze({
    document: runtime.document,
    replica: runtime.replica,
    history: runtime.history,
    text: runtime.text,
  });
}

function createRuntime(
  initial: unknown,
  options: CollaborationRuntimeOptions,
  expectedEpoch?: CollaborationEpoch,
  profile: "atomic" | "text" = "atomic",
): InternalRuntime {
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

  let evaluatingValidation = false;
  const validate = options.validate;
  const evaluateValidation = (
    candidate: JSONValue,
  ): JSONPatchValidationResult => {
    if (evaluatingValidation) return ACCEPTANCE_REENTRANCY_FAILURE;
    evaluatingValidation = true;
    try {
      return validateCandidate(validate, candidate);
    } finally {
      evaluatingValidation = false;
    }
  };
  const initialValidation = evaluateValidation(initialProjected.value);
  if (!initialValidation.ok) {
    throw new TypeError(
      `Initial document value was rejected: ${initialValidation.reason ?? initialValidation.code}`,
    );
  }

  const documentStore = createJSONDocument(initialProjected.value);
  const actorId = options.actorId;
  const documentListeners = new Set<(change: JSONAppliedChange) => void>();
  const replicaStatusListeners = new Set<
    (status: ReplicaStatus) => void
  >();
  const notificationQueue: NotificationEvent[] = [];
  let notifying = false;
  let localCounter = 0;
  let known = new Map<string, CollaborationChange>();
  let graph = prepareGraph(known);
  let materialized = materializeTree(initialTree, [], Object.freeze([]));
  let graphRevision = 0;
  const textCaptures = new WeakMap<
    TextCapture,
    TextCaptureState
  >();
  const textPlans = new WeakMap<TextPlan, TextPlanState>();

  const prepareLocal = (
    operations: ReadonlyArray<JSONPatchOperation>,
  ): PreparedLocalResult => {
    if (evaluatingValidation) return ACCEPTANCE_REENTRANCY_FAILURE;
    const patched = applyPatch(documentStore.value, operations);
    if (!patched.ok) return patched;

    const validation = evaluateValidation(patched.value);
    if (!validation.ok) return validation;

    if (jsonEqual(documentStore.value, patched.value)) {
      return {
        ok: true,
        value: {
          patchValue: patched.value,
          change: null,
          known,
          graph,
          materialized,
        },
      };
    }

    if (graph.pending.some((row) => (
      row.changeId.actorId === actorId
    ))) {
      return failure(
        "actor_history_pending",
        "cannot author while this actor has pending causal history",
      );
    }
    if (localCounter >= Number.MAX_SAFE_INTEGER) {
      return failure(
        "actor_counter_exhausted",
        "actor change counter reached the maximum safe integer",
      );
    }
    const changeId: ChangeId = Object.freeze({
      actorId,
      counter: localCounter + 1,
    });
    const compiled = compilePatchOperations(
      materialized.tree,
      patched.change.applied,
      changeId,
      graph.ordered.length,
      profile === "text" ? { collaborativeText: true } : undefined,
    );
    if (!compiled.ok) {
      return failure(
        "collaboration_unsupported",
        compiled.reason,
      );
    }
    const change = freezeLocalChange(
      changeId,
      authorDependencies(graph, actorId, localCounter),
      compiled.value.ops,
    );
    const nextKnown = new Map(known);
    nextKnown.set(changeIdKey(change.changeId), change);
    const nextGraph = prepareGraph(nextKnown);
    const nextMaterialized = materializeChanges(
      initialTree,
      nextGraph.ordered,
      (candidate) => evaluateValidation(candidate),
    );
    if (!jsonEqual(nextMaterialized.value, patched.value)) {
      return failure(
        "collaboration_translation_mismatch",
        "semantic collaboration operations did not preserve the JSON Patch result",
      );
    }

    return {
      ok: true,
      value: {
        patchValue: patched.value,
        change,
        known: nextKnown,
        graph: nextGraph,
        materialized: nextMaterialized,
      },
    };
  };

  const document = Object.freeze({
    get value(): JSONValue {
      return documentStore.value;
    },
    at(pointer: string) {
      return documentStore.at(pointer);
    },
    query(jsonPath: string) {
      return documentStore.query(jsonPath);
    },
    validatePatch(
      operations: ReadonlyArray<JSONPatchOperation>,
    ): JSONPatchValidationResult {
      const prepared = prepareLocal(operations);
      return prepared.ok ? OK : prepared;
    },
    commit(
      operations: ReadonlyArray<JSONPatchOperation>,
      commitOptions?: JSONDocumentCommitOptions,
    ): JSONDocumentCommitResult {
      const prepared = prepareLocal(operations);
      if (!prepared.ok) return prepared;

      const committed = documentStore.commit(operations, commitOptions);
      if (!committed.ok) return committed;

      if (prepared.value.change !== null) {
        known = new Map(prepared.value.known);
        graph = prepared.value.graph;
        materialized = prepared.value.materialized;
        localCounter = prepared.value.change.changeId.counter;
        graphRevision += 1;
      }

      if (committed.change.applied.length > 0) {
        enqueueNotification({
          documentChange: committed.change,
          replicaStatus: currentReplicaStatus(),
        });
      }
      return committed;
    },
    subscribe(listener: (change: JSONAppliedChange) => void): () => void {
      documentListeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        documentListeners.delete(listener);
      };
    },
  } satisfies JSONDocument);

  const replica = Object.freeze({
    epoch,
    status: currentReplicaStatus,
    exportBundle(): CollaborationBundle {
      return Object.freeze({
        epoch,
        changes: Object.freeze([...known.values()].sort(compareChanges)),
      });
    },
    exportCheckpoint() {
      return createCheckpoint(
        initialValue,
        membership,
        epoch,
        [...known.values()].sort(compareChanges),
      );
    },
    ingest(input: unknown): CollaborationIngestResult {
      if (evaluatingValidation) {
        return {
          ok: false,
          code: "acceptance_reentrancy",
          reason: "validation callback cannot ingest collaboration changes",
        };
      }
      const prepared = prepareBundle(input);
      if (!prepared.ok) {
        return {
          ok: false,
          code: "invalid_bundle",
          reason: prepared.reason,
        };
      }
      const compatibility = checkEpoch(epoch, prepared.bundle.epoch);
      if (compatibility !== null) return compatibility;
      const unauthorized = unauthorizedChange(
        prepared.bundle.changes,
        membership,
      );
      if (unauthorized !== null) {
        return {
          ok: false,
          code: "membership_violation",
          reason: "bundle references an actor outside this epoch membership",
          changeId: freezeChangeId(unauthorized),
        };
      }

      const nextKnown = new Map(known);
      const duplicates: ChangeId[] = [];
      let additions = 0;
      for (const change of prepared.bundle.changes) {
        const key = changeIdKey(change.changeId);
        const existing = nextKnown.get(key);
        if (existing !== undefined) {
          if (!changesEqual(existing, change)) {
            return {
              ok: false,
              code: "duplicate_mismatch",
              reason: "a known changeId has a different payload",
              changeId: freezeChangeId(change.changeId),
            };
          }
          duplicates.push(freezeChangeId(change.changeId));
          continue;
        }
        nextKnown.set(key, change);
        additions += 1;
      }

      const cycle = graphCycle(nextKnown);
      if (cycle !== null) {
        return {
          ok: false,
          code: "dependency_cycle",
          reason: "causal change dependencies contain a cycle",
          changeId: freezeChangeId(cycle),
        };
      }
      const dependencyFork = findActorDependencyFork(nextKnown);
      if (dependencyFork !== null) {
        return {
          ok: false,
          code: "actor_fork",
          reason: "one actorId must form one contiguous causal change chain",
          changeId: freezeChangeId(dependencyFork),
        };
      }
      if (additions === 0) {
        return {
          ok: true,
          integrated: Object.freeze([]),
          pending: Object.freeze(graph.pending.map((row) => row.changeId)),
          duplicates: Object.freeze(duplicates.sort(compareChangeIds)),
        };
      }

      const nextGraph = prepareGraph(nextKnown);
      const actorFork = findActorFork(nextGraph.ordered);
      if (actorFork !== null) {
        return {
          ok: false,
          code: "actor_fork",
          reason: "one actorId must form one contiguous causal change chain",
          changeId: freezeChangeId(actorFork),
        };
      }
      const previousReady = graph.readyKeys;
      const integrated = nextGraph.ordered
        .filter((change) => !previousReady.has(changeIdKey(change.changeId)))
        .map((change) => freezeChangeId(change.changeId))
        .sort(compareChangeIds);
      const nextMaterialized = materializeChanges(
        initialTree,
        nextGraph.ordered,
        (candidate) => evaluateValidation(candidate),
      );
      const changed = !jsonEqual(documentStore.value, nextMaterialized.value);

      known = nextKnown;
      graph = nextGraph;
      materialized = nextMaterialized;
      graphRevision += 1;
      for (const change of prepared.bundle.changes) {
        if (
          change.changeId.actorId === actorId
          && change.changeId.counter > localCounter
        ) {
          localCounter = change.changeId.counter;
        }
      }

      let documentChange: JSONAppliedChange | undefined;
      if (changed) {
        const documentCommit = documentStore.commit([{
          op: "replace",
          path: "",
          value: materialized.value,
        }]);
        if (!documentCommit.ok) {
          throw new Error(
            `collaboration document commit failed: ${documentCommit.reason ?? documentCommit.code}`,
          );
        }
        documentChange = documentCommit.change;
      }
      enqueueNotification({
        ...(documentChange === undefined ? {} : { documentChange }),
        replicaStatus: currentReplicaStatus(),
      });

      return {
        ok: true,
        integrated: Object.freeze(integrated),
        pending: Object.freeze(
          nextGraph.pending
            .map((row) => row.changeId)
            .sort(compareChangeIds),
        ),
        duplicates: Object.freeze(duplicates.sort(compareChangeIds)),
      };
    },
    subscribe(
      listener: (status: ReplicaStatus) => void,
    ): () => void {
      replicaStatusListeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        replicaStatusListeners.delete(listener);
      };
    },
  } satisfies CollaborationReplica);

  const history = Object.freeze({
    status(): HistoryStatus {
      return resolveHistoryState().status;
    },
    canUndo(): JSONPatchValidationResult {
      const prepared = prepareHistoryChange("undo");
      return prepared.ok ? OK : prepared;
    },
    undo(): HistoryResult {
      return commitHistoryChange("undo");
    },
    canRedo(): JSONPatchValidationResult {
      const prepared = prepareHistoryChange("redo");
      return prepared.ok ? OK : prepared;
    },
    redo(): HistoryResult {
      return commitHistoryChange("redo");
    },
  } satisfies History);

  const text = profile === "text"
    ? Object.freeze({
        capture(pointer: string) {
          if (evaluatingValidation) {
            return textFailure(
              "acceptance_reentrancy",
              "validation callback cannot capture collaborative text",
            );
          }
          let segments: string[];
          try {
            segments = parsePointer(pointer);
          } catch (error) {
            return textFailure(
              "invalid_pointer",
              error instanceof Error ? error.message : "invalid pointer",
            );
          }
          const snapshot = resolveTextSnapshot(materialized.tree, segments);
          if (!snapshot.ok) {
            return textFailure(snapshot.code, snapshot.reason);
          }
          const capture = Object.freeze({
            pointer,
            target: snapshot.value.target,
            textNode: snapshot.value.textNode,
            value: snapshot.value.value,
          });
          const state: TextCaptureState = Object.freeze({
            capture,
            atoms: snapshot.value.atoms,
            deps: Object.freeze(
              authorDependencies(graph, actorId, localCounter)
                .map(freezeChangeId),
            ),
            actorCounter: localCounter,
          });
          textCaptures.set(capture, state);
          return Object.freeze({ ok: true, capture });
        },
        plan(
          capture: TextCapture,
          observation: TextObservation,
        ): TextPlanResult {
          if (evaluatingValidation) {
            return textFailure(
              "acceptance_reentrancy",
              "validation callback cannot plan collaborative text",
            );
          }
          const captured = textCaptures.get(capture);
          if (captured === undefined) {
            return textFailure(
              "invalid_text_capture",
              "capture was not created by this text runtime",
            );
          }
          if (captured.actorCounter !== localCounter) {
            return textFailure(
              "stale_text_capture",
              "this actor authored another Change after text capture",
            );
          }
          if (
            typeof observation !== "object"
            || observation === null
            || typeof observation.value !== "string"
          ) {
            return textFailure(
              "invalid_text_observation",
              "text observation must contain a string value",
            );
          }
          const selection = prepareTextSelection(
            observation.selection,
            observation.value,
          );
          if (!selection.ok) return selection;
          const current = resolveTextMemberSnapshot(
            materialized.tree,
            captured.capture.target,
            captured.capture.textNode,
          );
          if (!current.ok) {
            return textFailure(current.code, current.reason);
          }
          if (graph.pending.some((row) => (
            row.changeId.actorId === actorId
          ))) {
            return textFailure(
              "actor_history_pending",
              "cannot author while this actor has pending causal history",
            );
          }
          const basis = Object.freeze({
            textNode: captured.capture.textNode,
            value: captured.capture.value,
            atoms: captured.atoms,
          });
          const splice = createMinimalTextSplice(
            basis,
            observation.value,
          );
          if (
            splice !== null
            && localCounter >= Number.MAX_SAFE_INTEGER
          ) {
            return textFailure(
              "actor_counter_exhausted",
              "actor change counter reached the maximum safe integer",
            );
          }
          const operation: TextSpliceOperation | null = splice === null
            ? null
            : Object.freeze({
                kind: "text-splice",
                target: captured.capture.target,
                textNode: captured.capture.textNode,
                left: splice.left,
                right: splice.right,
                removed: splice.removed,
                inserted: splice.inserted,
              });
          const predictedChangeId = Object.freeze({
            actorId,
            counter: captured.actorCounter + 1,
          });
          const observedAtomIds = observedTextAtomIds(
            captured.atoms,
            operation,
            predictedChangeId,
          );
          const selectionGaps = selection.value === null
            ? null
            : {
                anchor: textSelectionGap(
                  observation.value,
                  observedAtomIds,
                  selection.value.anchor,
                ),
                focus: textSelectionGap(
                  observation.value,
                  observedAtomIds,
                  selection.value.focus,
                ),
              };
          if (
            selectionGaps !== null
            && (selectionGaps.anchor === null || selectionGaps.focus === null)
          ) {
            return textFailure(
              "invalid_text_offset",
              "selection must use UTF-16 scalar boundaries",
            );
          }
          const plan = Object.freeze({
            pointer: captured.capture.pointer,
            value: observation.value,
            ...(selection.value === null
              ? {}
              : { selection: selection.value }),
          });
          textPlans.set(plan, Object.freeze({
            plan,
            capture: captured,
            operation,
            graphRevision,
            anchorGap: selectionGaps?.anchor ?? null,
            focusGap: selectionGaps?.focus ?? null,
          }));
          return Object.freeze({ ok: true, plan });
        },
        commit(
          plan: TextPlan,
          commitOptions?: JSONDocumentCommitOptions,
        ): TextCommitResult {
          if (evaluatingValidation) {
            return textFailure(
              "acceptance_reentrancy",
              "validation callback cannot commit collaborative text",
            );
          }
          const planned = textPlans.get(plan);
          if (planned === undefined) {
            return textFailure(
              "invalid_text_plan",
              "plan was not created by this text runtime",
            );
          }
          if (
            planned.capture.actorCounter !== localCounter
            || graph.pending.some((row) => row.changeId.actorId === actorId)
          ) {
            return textFailure(
              "stale_text_capture",
              "this actor history changed after text capture",
            );
          }
          if (planned.graphRevision !== graphRevision) {
            return textFailure(
              "stale_text_plan",
              "causal state changed after text planning",
            );
          }
          const current = resolveTextMemberSnapshot(
            materialized.tree,
            planned.capture.capture.target,
            planned.capture.capture.textNode,
          );
          if (!current.ok) {
            return textFailure(current.code, current.reason);
          }
          const metadataProbe = documentStore.commit([], commitOptions);
          if (!metadataProbe.ok) {
            return textFailure(
              metadataProbe.code,
              metadataProbe.reason ?? metadataProbe.code,
            );
          }
          if (planned.operation === null) {
            const textState = materialized.tree.texts.get(
              planned.capture.capture.textNode,
            );
            const value = textState === undefined
              ? current.value.value
              : projectText(textState);
            return Object.freeze({
              ok: true,
              change: metadataProbe.change,
              changeId: null,
              didChangeDocument: false,
              value,
              selection: resolvePlannedSelection(planned, textState),
            });
          }
          if (localCounter >= Number.MAX_SAFE_INTEGER) {
            return textFailure(
              "actor_counter_exhausted",
              "actor change counter reached the maximum safe integer",
            );
          }

          const changeId = Object.freeze({
            actorId,
            counter: localCounter + 1,
          });
          const change = freezeLocalChange(
            changeId,
            planned.capture.deps,
            [planned.operation],
          );
          const nextKnown = new Map(known);
          nextKnown.set(changeIdKey(changeId), change);
          const nextGraph = prepareGraph(nextKnown);
          const nextMaterialized = materializeChanges(
            initialTree,
            nextGraph.ordered,
            (candidate) => evaluateValidation(candidate),
          );
          const changeKey = changeIdKey(changeId);
          if (!nextMaterialized.history.appliedKeys.has(changeKey)) {
            const suppressed = nextMaterialized.suppressed.find((entry) => (
              changeIdKey(entry.changeId) === changeKey
            ));
            return textFailure(
              suppressed?.code ?? "text_change_suppressed",
              suppressed?.reason
                ?? "collaborative text Change was suppressed",
            );
          }

          const didChangeDocument = !jsonEqual(
            documentStore.value,
            nextMaterialized.value,
          );
          known = nextKnown;
          graph = nextGraph;
          materialized = nextMaterialized;
          localCounter = changeId.counter;
          graphRevision += 1;

          let documentChange: JSONAppliedChange | undefined;
          if (didChangeDocument) {
            const documentCommit = documentStore.commit([{
              op: "replace",
              path: "",
              value: materialized.value,
            }], {
              ...(metadataProbe.change.metadata === undefined
                ? {}
                : { metadata: metadataProbe.change.metadata }),
            });
            if (!documentCommit.ok) {
              throw new Error(
                `text document commit failed: ${documentCommit.reason ?? documentCommit.code}`,
              );
            }
            documentChange = documentCommit.change;
          }
          enqueueNotification({
            ...(documentChange === undefined ? {} : { documentChange }),
            replicaStatus: currentReplicaStatus(),
          });

          const textState = materialized.tree.texts.get(
            planned.capture.capture.textNode,
          );
          if (textState === undefined) {
            throw new Error("authored text generation is missing");
          }
          return Object.freeze({
            ok: true,
            change: documentChange ?? metadataProbe.change,
            changeId: freezeChangeId(changeId),
            didChangeDocument,
            value: projectText(textState),
            selection: resolvePlannedSelection(planned, textState),
          });
        },
      } satisfies Text)
    : undefined;

  return Object.freeze({
    document,
    replica,
    history,
    ...(text === undefined ? {} : { text }),
  });

  function resolveHistoryState(): ResolvedHistoryState {
    let undoTarget: ChangeId | null = null;
    let undoDepth = 0;
    let latestOwnDataIndex = -1;
    for (let index = graph.ordered.length - 1; index >= 0; index -= 1) {
      const change = graph.ordered[index];
      if (
        change !== undefined
        && change.changeId.actorId === actorId
        && isUndoableChange(change)
      ) {
        if (latestOwnDataIndex === -1) latestOwnDataIndex = index;
        const key = changeIdKey(change.changeId);
        if (
          materialized.history.appliedKeys.has(key)
          && !materialized.history.disabledByTarget.has(key)
        ) {
          undoDepth += 1;
          undoTarget ??= freezeChangeId(change.changeId);
        }
      }
    }

    let redoTarget: ChangeId | null = null;
    let redoDepth = 0;
    let effectiveUndo: ChangeId | null = null;
    for (let index = graph.ordered.length - 1; index >= 0; index -= 1) {
      if (index <= latestOwnDataIndex) break;
      const change = graph.ordered[index];
      if (
        change === undefined
        || change.changeId.actorId !== actorId
        || !materialized.history.appliedHistoryKeys.has(
          changeIdKey(change.changeId),
        )
      ) {
        continue;
      }
      const operation = historyOperationFor(change);
      if (operation?.kind !== "undo-change") continue;
      const targetKey = changeIdKey(operation.target);
      const activeUndo = materialized.history.disabledByTarget.get(targetKey);
      if (
        activeUndo !== undefined
        && changeIdKey(activeUndo) === changeIdKey(change.changeId)
      ) {
        redoDepth += 1;
        if (redoTarget === null) {
          redoTarget = freezeChangeId(operation.target);
          effectiveUndo = freezeChangeId(change.changeId);
        }
      }
    }

    return {
      status: Object.freeze({
        undoTarget,
        redoTarget,
        undoDepth,
        redoDepth,
        revision: graphRevision,
      }),
      effectiveUndo,
    };
  }

  function prepareHistoryChange(
    direction: "undo" | "redo",
  ): PreparedHistoryResult {
    if (evaluatingValidation) {
      return failure(
        "acceptance_reentrancy",
        "validation callback cannot author history changes",
      );
    }
    if (graph.pending.some((row) => row.changeId.actorId === actorId)) {
      return failure(
        "actor_history_pending",
        "cannot author while this actor has pending causal history",
      );
    }
    if (localCounter >= Number.MAX_SAFE_INTEGER) {
      return failure(
        "actor_counter_exhausted",
        "actor change counter reached the maximum safe integer",
      );
    }

    const resolved = resolveHistoryState();
    const target = direction === "undo"
      ? resolved.status.undoTarget
      : resolved.status.redoTarget;
    if (target === null) {
      return failure(
        direction === "undo" ? "nothing_to_undo" : "nothing_to_redo",
        direction === "undo"
          ? "this actor has no active accepted Change to undo"
          : "this actor has no effective undo Change to redo",
      );
    }
    if (direction === "redo" && resolved.effectiveUndo === null) {
      return failure(
        "nothing_to_redo",
        "this actor has no effective undo Change to redo",
      );
    }

    const changeId = Object.freeze({
      actorId,
      counter: localCounter + 1,
    });
    const operation = direction === "undo"
      ? { kind: "undo-change" as const, target }
      : {
          kind: "redo-change" as const,
          undo: resolved.effectiveUndo as ChangeId,
        };
    const change = freezeLocalChange(
      changeId,
      authorDependencies(graph, actorId, localCounter),
      [operation],
    );
    const nextKnown = new Map(known);
    nextKnown.set(changeIdKey(changeId), change);
    const nextGraph = prepareGraph(nextKnown);
    const nextMaterialized = materializeChanges(
      initialTree,
      nextGraph.ordered,
      (candidate) => evaluateValidation(candidate),
    );
    const controlKey = changeIdKey(changeId);
    if (!nextMaterialized.history.appliedHistoryKeys.has(controlKey)) {
      const suppressed = nextMaterialized.suppressed.find((entry) => (
        changeIdKey(entry.changeId) === controlKey
      ));
      return failure(
        suppressed?.code ?? `${direction}_suppressed`,
        suppressed?.reason ?? `${direction} could not preserve accepted changes`,
      );
    }

    return {
      ok: true,
      value: {
        change,
        target,
        known: nextKnown,
        graph: nextGraph,
        materialized: nextMaterialized,
        didChangeDocument: !jsonEqual(
          documentStore.value,
          nextMaterialized.value,
        ),
      },
    };
  }

  function commitHistoryChange(
    direction: "undo" | "redo",
  ): HistoryResult {
    const prepared = prepareHistoryChange(direction);
    if (!prepared.ok) return prepared;

    known = new Map(prepared.value.known);
    graph = prepared.value.graph;
    materialized = prepared.value.materialized;
    localCounter = prepared.value.change.changeId.counter;
    graphRevision += 1;

    let documentChange: JSONAppliedChange | undefined;
    if (prepared.value.didChangeDocument) {
      const documentCommit = documentStore.commit([{
        op: "replace",
        path: "",
        value: materialized.value,
      }]);
      if (!documentCommit.ok) {
        throw new Error(
          `history document commit failed: ${documentCommit.reason ?? documentCommit.code}`,
        );
      }
      documentChange = documentCommit.change;
    }
    enqueueNotification({
      ...(documentChange === undefined ? {} : { documentChange }),
      replicaStatus: currentReplicaStatus(),
    });

    return Object.freeze({
      ok: true,
      changeId: freezeChangeId(prepared.value.change.changeId),
      target: freezeChangeId(prepared.value.target),
      didChangeDocument: prepared.value.didChangeDocument,
    });
  }

  function currentReplicaStatus(): ReplicaStatus {
    return Object.freeze({
      epoch,
      heads: graph.heads,
      pending: freezePending(graph.pending),
      conflicts: freezeConflicts(materialized.conflicts),
      suppressed: freezeSuppressed(materialized.suppressed),
    });
  }

  function enqueueNotification(event: NotificationEvent): void {
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
  }
}

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

function failure(
  code: string,
  reason?: string,
): Extract<JSONDocumentCommitResult, { readonly ok: false }> {
  return Object.freeze({
    ok: false,
    code,
    ...(reason === undefined ? {} : { reason }),
  });
}

const OK: JSONPatchValidationResult = Object.freeze({ ok: true });
const ACCEPTANCE_REENTRANCY_FAILURE = failure(
  "acceptance_reentrancy",
  "validation callback cannot call validatePatch or commit",
);
