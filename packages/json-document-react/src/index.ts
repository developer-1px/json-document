import { useCallback, useState, useSyncExternalStore } from "react";
import type { JSONDocument, JSONValue } from "@interactive-os/json-document";
import {
  createDocumentEditor,
  type BlockDocument,
  type DocumentEditor,
} from "@interactive-os/json-document-editing";

export type { EditingSnapshot } from "@interactive-os/json-document-editing";
export {
  useEditingObservation,
  type EditingObservation,
  type EditingObservedResult,
  type EditingOperationResult,
  type EditingResultMessage,
} from "./editing-observation.js";
export {
  useEditingSnapshot,
  type EditingSnapshotSource,
} from "./editing-snapshot.js";
export {
  restoreTextCursor,
  selectionModeFromModifiers,
  useEditing,
  useRestoreTextCursor,
  useRestoreElementFocus,
  type Editing,
  type EditingItem,
  type EditingKeyDownEvent,
  type EditingKeyboardCommand,
  type EditingKeyboardOptions,
  type EditingKeyboardStroke,
  type EditingPressEvent,
  type EditingSelectionMode,
  type ElementFocusControl,
  type TextCursorControl,
  type UseEditingOptions,
} from "./use-editing.js";
export {
  DocumentTextControl,
  useDocumentTextControl,
  type DocumentTextControlBinding,
  type DocumentTextControlProps,
  type UseDocumentTextControlOptions,
} from "./use-document-text-control.js";
export {
  useGridEditing,
  type GridEditing,
  type GridEditingKeyboardOptions,
  type UseGridEditingOptions,
} from "./use-grid-editing.js";

export function useJSONDocumentValue(document: JSONDocument): JSONValue {
  const subscribe = useCallback(
    (notify: () => void) => document.subscribe(() => notify()),
    [document],
  );
  const getSnapshot = useCallback(() => document.value, [document]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Official React Connector entry point for a JSONDocument subscription. */
export function useReactConnector(document: JSONDocument): JSONValue {
  return useJSONDocumentValue(document);
}

export function useDocumentEditor(
  initial: BlockDocument,
  options: { readonly createId?: () => string } = {},
): DocumentEditor {
  const [editor] = useState(() => createDocumentEditor(initial, options));
  return editor;
}
