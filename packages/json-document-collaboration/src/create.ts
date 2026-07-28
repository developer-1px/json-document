import {
  applyPatch,
  createJSONDocument,
  parsePointer,
  type JSONAppliedChange,
  type JSONCapabilityResult,
  type JSONDocument,
  type JSONDocumentCommitOptions,
  type JSONDocumentCommitResult,
  type JSONPatchOperation,
  type JSONValue,
} from "@interactive-os/json-document";

import {
  canonicalMembership,
  canonicalStringify,
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
  type PreparedGraph,
} from "./change.js";
import { jsonEqual } from "./jsonEqual.js";
import { createCheckpoint } from "./checkpoint.js";
import {
  acceptCandidate,
  historyOperationFor,
  isUndoableChange,
  materializeChanges,
  projectAcceptedTree,
  type MaterializedDocument,
} from "./materialize.js";
import {
  createInitialTree,
  projectTree,
  resolveTextMemberSnapshot,
  resolveTextSnapshot,
  type TreeState,
} from "./tree.js";
import {
  authoredTextAtomId,
  createMinimalTextSplice,
  initialTextAtomId,
  projectText,
  textUnits,
  type TextAtomSnapshot,
  type TextState,
} from "./text-core.js";
import { compilePatchOperations } from "./translate.js";
import type {
  ChangeId,
  CollaborationBundle,
  CollaborationChange,
  CollaborationConflict,
  CollaborationControl,
  CollaborationEpoch,
  CollaborationHistoryControl,
  CollaborationHistoryResult,
  CollaborationHistoryRuntime,
  CollaborationHistorySnapshot,
  CollaborationIngestResult,
  CollaborationRuntime,
  CollaborationRuntimeOptions,
  CollaborationSnapshot,
  CollaborationMembership,
  CollaborationTextCapture,
  CollaborationTextCommitResult,
  CollaborationTextControl,
  CollaborationTextObservation,
  CollaborationTextPlan,
  CollaborationTextPlanResult,
  CollaborationTextRuntime,
  CollaborationTextSelection,
  PendingChange,
  SuppressedChange,
  TextAtomId,
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

interface PublicationEvent {
  readonly documentChange?: JSONAppliedChange;
  readonly collaborationSnapshot: CollaborationSnapshot;
}

interface PreparedHistoryChange {
  readonly change: CollaborationChange;
  readonly target: ChangeId;
  readonly known: ReadonlyMap<string, CollaborationChange>;
  readonly graph: PreparedGraph;
  readonly materialized: MaterializedDocument;
  readonly projectionChanged: boolean;
}

type PreparedHistoryResult =
  | { readonly ok: true; readonly value: PreparedHistoryChange }
  | Extract<CollaborationHistoryResult, { readonly ok: false }>;

interface ResolvedHistoryState {
  readonly snapshot: CollaborationHistorySnapshot;
  readonly effectiveUndo: ChangeId | null;
}

interface InternalRuntime extends CollaborationHistoryRuntime {
  readonly text?: CollaborationTextControl;
}

interface TextCaptureState {
  readonly capture: CollaborationTextCapture;
  readonly atoms: ReadonlyArray<TextAtomSnapshot>;
  readonly deps: ReadonlyArray<ChangeId>;
  readonly actorCounter: number;
}

interface TextSelectionGap {
  readonly left: TextAtomId | null;
  readonly right: TextAtomId | null;
  readonly affinity: "after-left" | "before-right";
}

interface TextPlanState {
  readonly plan: CollaborationTextPlan;
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
    collaboration: runtime.collaboration,
  });
}

export function createCollaborationTextRuntime(
  initial: unknown,
  options: CollaborationRuntimeOptions,
): CollaborationTextRuntime {
  const runtime = createRuntime(initial, options, undefined, "text");
  if (runtime.text === undefined) {
    throw new Error("collaborative text profile was not initialized");
  }
  return Object.freeze({
    document: runtime.document,
    collaboration: runtime.collaboration,
    text: runtime.text,
  });
}

export function createCollaborationHistoryRuntime(
  initial: unknown,
  options: CollaborationRuntimeOptions,
): CollaborationHistoryRuntime {
  return createRuntime(initial, options);
}

export function createRestoredRuntime(
  initial: unknown,
  options: CollaborationRuntimeOptions,
  expectedEpoch: CollaborationEpoch,
): CollaborationHistoryRuntime {
  return createRuntime(initial, options, expectedEpoch);
}

export function createRestoredTextRuntime(
  initial: unknown,
  options: CollaborationRuntimeOptions,
  expectedEpoch: CollaborationEpoch,
): CollaborationTextRuntime {
  const runtime = createRuntime(initial, options, expectedEpoch, "text");
  if (runtime.text === undefined) {
    throw new Error("collaborative text profile was not initialized");
  }
  return Object.freeze({
    document: runtime.document,
    collaboration: runtime.collaboration,
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

  let evaluatingAcceptance = false;
  const evaluateAcceptance = (candidate: JSONValue): JSONCapabilityResult => {
    if (evaluatingAcceptance) return ACCEPTANCE_REENTRANCY_FAILURE;
    evaluatingAcceptance = true;
    try {
      return acceptCandidate(options.accepts, candidate);
    } finally {
      evaluatingAcceptance = false;
    }
  };
  const initialAcceptance = evaluateAcceptance(initialProjected.value);
  if (!initialAcceptance.ok) {
    throw new TypeError(
      `Initial document value was rejected: ${initialAcceptance.reason ?? initialAcceptance.code}`,
    );
  }

  const projection = createJSONDocument(initialProjected.value);
  const actorId = options.actorId;
  const documentListeners = new Set<(change: JSONAppliedChange) => void>();
  const collaborationListeners = new Set<
    (snapshot: CollaborationSnapshot) => void
  >();
  const publicationQueue: PublicationEvent[] = [];
  let publishing = false;
  let localCounter = 0;
  let known = new Map<string, CollaborationChange>();
  let graph = prepareGraph(known);
  let materialized = projectAcceptedTree(initialTree, [], Object.freeze([]));
  let graphRevision = 0;
  const textCaptures = new WeakMap<
    CollaborationTextCapture,
    TextCaptureState
  >();
  const textPlans = new WeakMap<CollaborationTextPlan, TextPlanState>();

  const prepareLocal = (
    operations: ReadonlyArray<JSONPatchOperation>,
  ): PreparedLocalResult => {
    if (evaluatingAcceptance) return ACCEPTANCE_REENTRANCY_FAILURE;
    const patched = applyPatch(projection.value, operations);
    if (!patched.ok) return patched;

    const accepted = evaluateAcceptance(patched.value);
    if (!accepted.ok) return accepted;

    if (jsonEqual(projection.value, patched.value)) {
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
      (candidate) => evaluateAcceptance(candidate),
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
      return projection.value;
    },
    at(pointer: string) {
      return projection.at(pointer);
    },
    query(jsonPath: string) {
      return projection.query(jsonPath);
    },
    canPatch(
      operations: ReadonlyArray<JSONPatchOperation>,
    ): JSONCapabilityResult {
      const prepared = prepareLocal(operations);
      return prepared.ok ? OK : prepared;
    },
    commit(
      operations: ReadonlyArray<JSONPatchOperation>,
      commitOptions?: JSONDocumentCommitOptions,
    ): JSONDocumentCommitResult {
      const prepared = prepareLocal(operations);
      if (!prepared.ok) return prepared;

      const committed = projection.commit(operations, commitOptions);
      if (!committed.ok) return committed;

      if (prepared.value.change !== null) {
        known = new Map(prepared.value.known);
        graph = prepared.value.graph;
        materialized = prepared.value.materialized;
        localCounter = prepared.value.change.changeId.counter;
        graphRevision += 1;
      }

      if (committed.change.applied.length > 0) {
        enqueuePublication({
          documentChange: committed.change,
          collaborationSnapshot: currentSnapshot(),
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

  const collaboration = Object.freeze({
    epoch,
    current: currentSnapshot,
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
      if (evaluatingAcceptance) {
        return {
          ok: false,
          code: "acceptance_reentrancy",
          reason: "acceptance callback cannot ingest collaboration changes",
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
        (candidate) => evaluateAcceptance(candidate),
      );
      const changed = !jsonEqual(projection.value, nextMaterialized.value);

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
        const publication = projection.commit([{
          op: "replace",
          path: "",
          value: materialized.value,
        }]);
        if (!publication.ok) {
          throw new Error(
            `collaboration projection publication failed: ${publication.reason ?? publication.code}`,
          );
        }
        documentChange = publication.change;
      }
      enqueuePublication({
        ...(documentChange === undefined ? {} : { documentChange }),
        collaborationSnapshot: currentSnapshot(),
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
      listener: (snapshot: CollaborationSnapshot) => void,
    ): () => void {
      collaborationListeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        collaborationListeners.delete(listener);
      };
    },
  } satisfies CollaborationControl);

  const history = Object.freeze({
    current(): CollaborationHistorySnapshot {
      return resolveHistoryState().snapshot;
    },
    canUndo(): JSONCapabilityResult {
      const prepared = prepareHistoryChange("undo");
      return prepared.ok ? OK : prepared;
    },
    undo(): CollaborationHistoryResult {
      return commitHistoryChange("undo");
    },
    canRedo(): JSONCapabilityResult {
      const prepared = prepareHistoryChange("redo");
      return prepared.ok ? OK : prepared;
    },
    redo(): CollaborationHistoryResult {
      return commitHistoryChange("redo");
    },
  } satisfies CollaborationHistoryControl);

  const text = profile === "text"
    ? Object.freeze({
        capture(pointer: string) {
          if (evaluatingAcceptance) {
            return textFailure(
              "acceptance_reentrancy",
              "acceptance callback cannot capture collaborative text",
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
          capture: CollaborationTextCapture,
          observation: CollaborationTextObservation,
        ): CollaborationTextPlanResult {
          if (evaluatingAcceptance) {
            return textFailure(
              "acceptance_reentrancy",
              "acceptance callback cannot plan collaborative text",
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
        commit(plan: CollaborationTextPlan): CollaborationTextCommitResult {
          if (evaluatingAcceptance) {
            return textFailure(
              "acceptance_reentrancy",
              "acceptance callback cannot commit collaborative text",
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
          if (planned.operation === null) {
            const textState = materialized.tree.texts.get(
              planned.capture.capture.textNode,
            );
            const value = textState === undefined
              ? current.value.value
              : projectText(textState);
            return Object.freeze({
              ok: true,
              changeId: null,
              projectionChanged: false,
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
            (candidate) => evaluateAcceptance(candidate),
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

          const projectionChanged = !jsonEqual(
            projection.value,
            nextMaterialized.value,
          );
          known = nextKnown;
          graph = nextGraph;
          materialized = nextMaterialized;
          localCounter = changeId.counter;
          graphRevision += 1;

          let documentChange: JSONAppliedChange | undefined;
          if (projectionChanged) {
            const publication = projection.commit([{
              op: "replace",
              path: "",
              value: materialized.value,
            }]);
            if (!publication.ok) {
              throw new Error(
                `text projection publication failed: ${publication.reason ?? publication.code}`,
              );
            }
            documentChange = publication.change;
          }
          enqueuePublication({
            ...(documentChange === undefined ? {} : { documentChange }),
            collaborationSnapshot: currentSnapshot(),
          });

          const textState = materialized.tree.texts.get(
            planned.capture.capture.textNode,
          );
          if (textState === undefined) {
            throw new Error("authored text generation is missing");
          }
          return Object.freeze({
            ok: true,
            changeId: freezeChangeId(changeId),
            projectionChanged,
            value: projectText(textState),
            selection: resolvePlannedSelection(planned, textState),
          });
        },
      } satisfies CollaborationTextControl)
    : undefined;

  return Object.freeze({
    document,
    collaboration,
    history,
    ...(text === undefined ? {} : { text }),
  });

  function resolveHistoryState(): ResolvedHistoryState {
    let undoTarget: ChangeId | null = null;
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
          undoTarget = freezeChangeId(change.changeId);
          break;
        }
      }
    }

    let redoTarget: ChangeId | null = null;
    let effectiveUndo: ChangeId | null = null;
    for (let index = graph.ordered.length - 1; index >= 0; index -= 1) {
      if (index <= latestOwnDataIndex) break;
      const change = graph.ordered[index];
      if (
        change === undefined
        || change.changeId.actorId !== actorId
        || !materialized.history.appliedControlKeys.has(
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
        redoTarget = freezeChangeId(operation.target);
        effectiveUndo = freezeChangeId(change.changeId);
        break;
      }
    }

    return {
      snapshot: Object.freeze({ undoTarget, redoTarget }),
      effectiveUndo,
    };
  }

  function prepareHistoryChange(
    direction: "undo" | "redo",
  ): PreparedHistoryResult {
    if (evaluatingAcceptance) {
      return failure(
        "acceptance_reentrancy",
        "acceptance callback cannot author history changes",
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
      ? resolved.snapshot.undoTarget
      : resolved.snapshot.redoTarget;
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
      (candidate) => evaluateAcceptance(candidate),
    );
    const controlKey = changeIdKey(changeId);
    if (!nextMaterialized.history.appliedControlKeys.has(controlKey)) {
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
        projectionChanged: !jsonEqual(
          projection.value,
          nextMaterialized.value,
        ),
      },
    };
  }

  function commitHistoryChange(
    direction: "undo" | "redo",
  ): CollaborationHistoryResult {
    const prepared = prepareHistoryChange(direction);
    if (!prepared.ok) return prepared;

    known = new Map(prepared.value.known);
    graph = prepared.value.graph;
    materialized = prepared.value.materialized;
    localCounter = prepared.value.change.changeId.counter;
    graphRevision += 1;

    let documentChange: JSONAppliedChange | undefined;
    if (prepared.value.projectionChanged) {
      const publication = projection.commit([{
        op: "replace",
        path: "",
        value: materialized.value,
      }]);
      if (!publication.ok) {
        throw new Error(
          `history projection publication failed: ${publication.reason ?? publication.code}`,
        );
      }
      documentChange = publication.change;
    }
    enqueuePublication({
      ...(documentChange === undefined ? {} : { documentChange }),
      collaborationSnapshot: currentSnapshot(),
    });

    return Object.freeze({
      ok: true,
      changeId: freezeChangeId(prepared.value.change.changeId),
      target: freezeChangeId(prepared.value.target),
      projectionChanged: prepared.value.projectionChanged,
    });
  }

  function currentSnapshot(): CollaborationSnapshot {
    return Object.freeze({
      epoch,
      heads: graph.heads,
      pending: freezePending(graph.pending),
      conflicts: freezeConflicts(materialized.conflicts),
      suppressed: freezeSuppressed(materialized.suppressed),
    });
  }

  function enqueuePublication(event: PublicationEvent): void {
    publicationQueue.push(event);
    if (publishing) return;

    publishing = true;
    try {
      while (publicationQueue.length > 0) {
        const next = publicationQueue.shift() as PublicationEvent;
        if (next.documentChange !== undefined) {
          for (const listener of [...documentListeners]) {
            if (!documentListeners.has(listener)) continue;
            try {
              listener(next.documentChange);
            } catch {
              // Publication follows a committed state change. A listener
              // failure cannot turn that write into an apparent failure or
              // prevent delivery to the remaining active listeners.
            }
          }
        }
        for (const listener of [...collaborationListeners]) {
          if (!collaborationListeners.has(listener)) continue;
          try {
            listener(next.collaborationSnapshot);
          } catch {
            // Collaboration snapshots follow committed causal state and use
            // the same failure-isolation rule as the document Projection.
          }
        }
      }
    } finally {
      publishing = false;
    }
  }
}

function checkEpoch(
  expected: CollaborationEpoch,
  actual: CollaborationEpoch,
): Extract<CollaborationIngestResult, { readonly ok: false }> | null {
  if (actual.epochId !== expected.epochId) {
    return {
      ok: false,
      code: "epoch_mismatch",
      reason: "bundle epochId does not match this document",
    };
  }
  if (
    actual.ruleset.id !== expected.ruleset.id
    || actual.ruleset.digest !== expected.ruleset.digest
  ) {
    return {
      ok: false,
      code: "ruleset_mismatch",
      reason: "bundle ruleset does not match this document epoch",
    };
  }
  if (actual.acceptance !== expected.acceptance) {
    return {
      ok: false,
      code: "ruleset_mismatch",
      reason: "bundle acceptance mode does not match this document epoch",
    };
  }
  if (actual.baseDigest !== expected.baseDigest) {
    return {
      ok: false,
      code: "checkpoint_mismatch",
      reason: "bundle checkpoint does not match this document epoch",
    };
  }
  if (actual.membershipDigest !== expected.membershipDigest) {
    return {
      ok: false,
      code: "membership_mismatch",
      reason: "bundle membership does not match this document epoch",
    };
  }
  if (
    canonicalStringify(actual.parent as unknown as JSONValue)
    !== canonicalStringify(expected.parent as unknown as JSONValue)
  ) {
    return {
      ok: false,
      code: "epoch_mismatch",
      reason: "bundle epoch parent does not match this document epoch",
    };
  }
  return null;
}

function validateOptions(options: CollaborationRuntimeOptions): void {
  if (
    typeof options !== "object"
    || options === null
    || typeof options.actorId !== "string"
    || options.actorId.length === 0
  ) {
    throw new TypeError("actorId must be a non-empty string");
  }
  if (typeof options.epochId !== "string" || options.epochId.length === 0) {
    throw new TypeError("epochId must be a non-empty string");
  }
  if (
    typeof options.ruleset !== "object"
    || options.ruleset === null
    || typeof options.ruleset.id !== "string"
    || options.ruleset.id.length === 0
    || typeof options.ruleset.digest !== "string"
    || options.ruleset.digest.length === 0
  ) {
    throw new TypeError("ruleset id and digest must be non-empty strings");
  }
  canonicalMembership(options.membership);
}

function unauthorizedChange(
  changes: ReadonlyArray<CollaborationChange>,
  membership: CollaborationMembership | null,
): ChangeId | null {
  if (membership === null) return null;
  for (const change of changes) {
    if (!membershipAllows(membership, change.changeId.actorId)) {
      return change.changeId;
    }
    for (const dependency of change.deps) {
      if (!membershipAllows(membership, dependency.actorId)) {
        return change.changeId;
      }
    }
    for (const operation of change.ops) {
      const referenced = operation.kind === "undo-change"
        ? operation.target
        : operation.kind === "redo-change"
          ? operation.undo
          : null;
      if (
        referenced !== null
        && !membershipAllows(membership, referenced.actorId)
      ) {
        return change.changeId;
      }
    }
  }
  return null;
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

function authorDependencies(
  graph: PreparedGraph,
  actorId: string,
  previousCounter: number,
): ReadonlyArray<ChangeId> {
  if (previousCounter === 0) return graph.heads;
  const previous = { actorId, counter: previousCounter };
  const dependencies = [...graph.heads];
  if (!dependencies.some((dependency) => (
    changeIdKey(dependency) === changeIdKey(previous)
  ))) {
    dependencies.push(previous);
  }
  return Object.freeze(dependencies.sort(compareChangeIds));
}

function prepareTextSelection(
  input: CollaborationTextSelection | undefined,
  value: string,
):
  | {
      readonly ok: true;
      readonly value: CollaborationTextSelection | null;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    } {
  if (input === undefined) return { ok: true, value: null };
  if (
    typeof input !== "object"
    || input === null
    || !Number.isSafeInteger(input.anchor)
    || !Number.isSafeInteger(input.focus)
    || input.anchor < 0
    || input.focus < 0
    || scalarBoundaryIndex(value, input.anchor) === null
    || scalarBoundaryIndex(value, input.focus) === null
  ) {
    return textFailure(
      "invalid_text_offset",
      "selection offsets must be valid UTF-16 scalar boundaries",
    );
  }
  return {
    ok: true,
    value: Object.freeze({
      anchor: input.anchor,
      focus: input.focus,
    }),
  };
}

function observedTextAtomIds(
  captured: ReadonlyArray<TextAtomSnapshot>,
  operation: TextSpliceOperation | null,
  changeId: ChangeId,
): ReadonlyArray<TextAtomId> {
  if (operation === null) {
    return Object.freeze(captured.map((atom) => atom.id));
  }
  const leftIndex = operation.left === null
    ? -1
    : captured.findIndex((atom) => atom.id === operation.left);
  const rightIndex = operation.right === null
    ? captured.length
    : captured.findIndex((atom) => atom.id === operation.right);
  const inserted = textUnits(operation.inserted).map((_, unitIndex) => (
    authoredTextAtomId(changeId, 0, unitIndex)
  ));
  return Object.freeze([
    ...captured.slice(0, leftIndex + 1).map((atom) => atom.id),
    ...inserted,
    ...captured.slice(rightIndex).map((atom) => atom.id),
  ]);
}

function textSelectionGap(
  value: string,
  atomIds: ReadonlyArray<TextAtomId>,
  offset: number,
): TextSelectionGap | null {
  const boundary = scalarBoundaryIndex(value, offset);
  if (boundary === null || atomIds.length !== textUnits(value).length) {
    return null;
  }
  return Object.freeze({
    left: boundary === 0 ? null : atomIds[boundary - 1] ?? null,
    right: boundary === atomIds.length ? null : atomIds[boundary] ?? null,
    affinity: boundary === 0 ? "before-right" : "after-left",
  });
}

function scalarBoundaryIndex(value: string, offset: number): number | null {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > value.length) {
    return null;
  }
  let cursor = 0;
  const units = textUnits(value);
  for (let index = 0; index <= units.length; index += 1) {
    if (cursor === offset) return index;
    const unit = units[index];
    if (unit !== undefined) cursor += unit.length;
  }
  return null;
}

function resolvePlannedSelection(
  planned: TextPlanState,
  state: TextState | undefined,
): CollaborationTextSelection | null {
  if (
    planned.plan.selection === undefined
    || planned.anchorGap === null
    || planned.focusGap === null
    || state === undefined
  ) {
    return null;
  }
  return Object.freeze({
    anchor: textGapOffset(state, planned.anchorGap),
    focus: textGapOffset(state, planned.focusGap),
  });
}

function textGapOffset(
  state: TextState,
  gap: TextSelectionGap,
): number {
  const order = state.order ?? textUnits(state.atomic).map((_, unitIndex) => (
    initialTextAtomId(state.id, unitIndex)
  ));
  const rightIndex = gap.right === null ? -1 : order.indexOf(gap.right);
  const leftIndex = gap.left === null ? -1 : order.indexOf(gap.left);
  const boundary = gap.affinity === "after-left" && leftIndex >= 0
      ? leftIndex + 1
      : rightIndex >= 0
        ? rightIndex
        : leftIndex >= 0
          ? leftIndex + 1
          : gap.left === null
        ? 0
        : order.length;
  let offset = 0;
  for (let index = 0; index < boundary; index += 1) {
    const id = order[index];
    if (id === undefined) continue;
    if (state.atoms === undefined) {
      const unitIndex = Number(id.slice(id.lastIndexOf(":") + 1));
      offset += textUnits(state.atomic)[unitIndex]?.length ?? 0;
      continue;
    }
    const atom = state.atoms.get(id);
    if (atom !== undefined && !atom.deleted) offset += atom.value.length;
  }
  return offset;
}

function textFailure(
  code: string,
  reason: string,
): {
  readonly ok: false;
  readonly code: string;
  readonly reason: string;
} {
  return Object.freeze({ ok: false, code, reason });
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

const OK: JSONCapabilityResult = Object.freeze({ ok: true });
const ACCEPTANCE_REENTRANCY_FAILURE = failure(
  "acceptance_reentrancy",
  "acceptance callback cannot call canPatch or commit",
);
