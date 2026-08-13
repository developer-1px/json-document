import { createDocumentRuntime } from "./document-runtime.js";
import { createHistory } from "./history-runtime.js";
import { createReplicaRuntime } from "./replica-runtime.js";
import {
  createRuntimeState,
  type RuntimeProfile,
} from "./runtime-state.js";
import { createText } from "./text-runtime.js";
import type {
  CollaborationEpoch,
  CollaborationRuntime,
  CollaborationRuntimeOptions,
  HistoryRuntime,
  TextRuntime,
} from "./types.js";

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
  const text = profile === "text" ? createText(state) : undefined;
  return Object.freeze({
    document: createDocumentRuntime(state),
    replica: createReplicaRuntime(state),
    history: createHistory(state),
    ...(text === undefined ? {} : { text }),
  });
}
