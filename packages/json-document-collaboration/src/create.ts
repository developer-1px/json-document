import { canonicalStringify } from "./change.js";
import type { JSONValue } from "@interactive-os/json-document";
import { createDocumentRuntime } from "./document-runtime.js";
import { createHistory } from "./history-runtime.js";
import { createReplicaRuntime } from "./replica-runtime.js";
import {
  createRuntimeState,
  assignCausalState,
  type RuntimeState,
  type RuntimeProfile,
} from "./runtime-state.js";
import { createText } from "./text-runtime.js";
import type {
  CollaborationEpoch,
  CollaborationRuntime,
  CollaborationRuntimeOptions,
  CollaborationRestoreOptions,
  HistoryRuntime,
  TextRuntime,
} from "./types.js";

const runtimeStates = new WeakMap<HistoryRuntime, { state: RuntimeState; options: CollaborationRuntimeOptions }>();

export function forkCompatibleHistoryRuntime(source: HistoryRuntime, options: CollaborationRestoreOptions): HistoryRuntime | undefined {
  const registered = runtimeStates.get(source);
  if (!registered || options.verify !== undefined || options.validate !== registered.options.validate
    || canonicalStringify(options.ruleset as unknown as JSONValue) !== canonicalStringify(registered.state.epoch.ruleset as unknown as JSONValue)) return undefined;
  return forkHistoryRuntime(source, options.actorId);
}

/** Fork a live, already validated runtime using the same epoch and acceptance rules. */
export function forkHistoryRuntime(source: HistoryRuntime, actorId: string): HistoryRuntime {
  const registered = runtimeStates.get(source);
  if (!registered) throw new TypeError("fork requires a history runtime created by this library instance");
  if (registered.state.evaluatingValidation) throw new TypeError("validation callback cannot fork a runtime");
  if (actorId === registered.state.actorId) throw new TypeError("fork requires a distinct actorId");
  const parent = registered.state;
  const options = { ...registered.options, actorId, epochId: parent.epoch.epochId,
    ruleset: parent.epoch.ruleset, ...(parent.membership === null ? {} : { membership: parent.membership }) };
  const state = createRuntimeState(parent.initialValue, options, parent.epoch, parent.profile);
  const committed = state.documentStore.commit([{ op: "replace", path: "", value: parent.materialized.value }]);
  if (!committed.ok) throw new Error(`fork document initialization failed: ${committed.code}`);
  let localCounter = 0;
  for (const change of parent.known.values()) {
    if (change.changeId.actorId === actorId) localCounter = Math.max(localCounter, change.changeId.counter);
  }
  assignCausalState(state, { known: parent.known, graph: parent.graph, materialized: parent.materialized, localCounter });
  return bindRuntime(state, options);
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
  profile: RuntimeProfile = "atomic",
): HistoryRuntime & { readonly text?: TextRuntime["text"] } {
  const state = createRuntimeState(initial, options, expectedEpoch, profile);
  return bindRuntime(state, options);
}

function bindRuntime(state: RuntimeState, options: CollaborationRuntimeOptions): HistoryRuntime & { readonly text?: TextRuntime["text"] } {
  const text = state.profile === "text" ? createText(state) : undefined;
  const runtime = Object.freeze({
    document: createDocumentRuntime(state),
    replica: createReplicaRuntime(state),
    history: createHistory(state),
    ...(text === undefined ? {} : { text }),
  });
  runtimeStates.set(runtime, { state, options: { ...options } });
  return runtime;
}
