import {
  parsePointer,
  type JSONDocumentCommitOptions,
} from "@interactive-os/json-document";

import {
  authorDependencies,
  changeIdKey,
  freezeChangeId,
  freezeLocalChange,
  prepareGraph,
} from "./change.js";
import { patchBetweenValues } from "./document-patch.js";
import { jsonEqual } from "./json-equal.js";
import { materializeChanges } from "./materialize.js";
import {
  resolveTextMemberSnapshot,
  resolveTextSnapshot,
} from "./tree.js";
import {
  createMinimalTextSplice,
  projectText,
} from "./text-core.js";
import {
  observedTextAtomIds,
  prepareTextSelection,
  resolvePlannedSelection,
  textFailure,
  textSelectionGap,
} from "./text-selection.js";
import { assignCausalState, type RuntimeState } from "./runtime-state.js";
import type {
  Text,
  TextCapture,
  TextCommitResult,
  TextObservation,
  TextPlan,
  TextPlanResult,
  TextSpliceOperation,
} from "./types.js";

export function createText(state: RuntimeState): Text {
  return Object.freeze({
    capture(pointer: string) {
      if (state.evaluatingValidation) {
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
      const snapshot = resolveTextSnapshot(state.materialized.tree, segments);
      if (!snapshot.ok) {
        return textFailure(snapshot.code, snapshot.reason);
      }
      const capture = Object.freeze({
        pointer,
        target: snapshot.value.target,
        textNode: snapshot.value.textNode,
        value: snapshot.value.value,
      });
      const captured = Object.freeze({
        capture,
        atoms: snapshot.value.atoms,
        deps: Object.freeze(
          authorDependencies(state.graph, state.actorId, state.localCounter)
            .map(freezeChangeId),
        ),
        actorCounter: state.localCounter,
      });
      state.textCaptures.set(capture, captured);
      return Object.freeze({ ok: true, capture });
    },
    plan(
      capture: TextCapture,
      observation: TextObservation,
    ): TextPlanResult {
      if (state.evaluatingValidation) {
        return textFailure(
          "acceptance_reentrancy",
          "validation callback cannot plan collaborative text",
        );
      }
      const captured = state.textCaptures.get(capture);
      if (captured === undefined) {
        return textFailure(
          "invalid_text_capture",
          "capture was not created by this text runtime",
        );
      }
      if (captured.actorCounter !== state.localCounter) {
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
        state.materialized.tree,
        captured.capture.target,
        captured.capture.textNode,
      );
      if (!current.ok) {
        return textFailure(current.code, current.reason);
      }
      if (state.graph.pending.some((row) => (
        row.changeId.actorId === state.actorId
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
        && state.localCounter >= Number.MAX_SAFE_INTEGER
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
        actorId: state.actorId,
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
      state.textPlans.set(plan, Object.freeze({
        plan,
        capture: captured,
        operation,
        graphRevision: state.graphRevision,
        anchorGap: selectionGaps?.anchor ?? null,
        focusGap: selectionGaps?.focus ?? null,
      }));
      return Object.freeze({ ok: true, plan });
    },
    commit(
      plan: TextPlan,
      commitOptions?: JSONDocumentCommitOptions,
    ): TextCommitResult {
      if (state.evaluatingValidation) {
        return textFailure(
          "acceptance_reentrancy",
          "validation callback cannot commit collaborative text",
        );
      }
      const planned = state.textPlans.get(plan);
      if (planned === undefined) {
        return textFailure(
          "invalid_text_plan",
          "plan was not created by this text runtime",
        );
      }
      if (
        planned.capture.actorCounter !== state.localCounter
        || state.graph.pending.some((row) => row.changeId.actorId === state.actorId)
      ) {
        return textFailure(
          "stale_text_capture",
          "this actor history changed after text capture",
        );
      }
      if (planned.graphRevision !== state.graphRevision) {
        return textFailure(
          "stale_text_plan",
          "causal state changed after text planning",
        );
      }
      const current = resolveTextMemberSnapshot(
        state.materialized.tree,
        planned.capture.capture.target,
        planned.capture.capture.textNode,
      );
      if (!current.ok) {
        return textFailure(current.code, current.reason);
      }
      const metadataProbe = state.documentStore.commit([], commitOptions);
      if (!metadataProbe.ok) {
        return textFailure(
          metadataProbe.code,
          metadataProbe.reason ?? metadataProbe.code,
        );
      }
      if (planned.operation === null) {
        const textState = state.materialized.tree.texts.get(
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
      if (state.localCounter >= Number.MAX_SAFE_INTEGER) {
        return textFailure(
          "actor_counter_exhausted",
          "actor change counter reached the maximum safe integer",
        );
      }

      const changeId = Object.freeze({
        actorId: state.actorId,
        counter: state.localCounter + 1,
      });
      const change = freezeLocalChange(
        changeId,
        planned.capture.deps,
        [planned.operation],
      );
      const nextKnown = new Map(state.known);
      nextKnown.set(changeIdKey(changeId), change);
      const nextGraph = prepareGraph(nextKnown);
      const nextMaterialized = materializeChanges(
        state.initialTree,
        nextGraph.ordered,
        (candidate) => state.evaluateValidation(candidate),
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
        state.documentStore.value,
        nextMaterialized.value,
      );
      assignCausalState(state, {
        known: nextKnown,
        graph: nextGraph,
        materialized: nextMaterialized,
        localCounter: changeId.counter,
      });

      let documentChange = undefined;
      if (didChangeDocument) {
        const documentCommit = state.documentStore.commit(patchBetweenValues(
          state.documentStore.value,
          state.materialized.value,
        ), {
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
      state.notify({
        ...(documentChange === undefined ? {} : { documentChange }),
        replicaStatus: state.replicaStatus(),
      });

      const textState = state.materialized.tree.texts.get(
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
  });
}
