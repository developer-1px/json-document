import { useMemo, useState, useSyncExternalStore } from "react";
import { jsonEqual, type JSONDocument, type JSONValue } from "@interactive-os/json-document";
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
  editingItemProps,
  selectionModeFromModifiers,
  useEditing,
  useRestoreTextCursor,
  useRestoreElementFocus,
  type Editing,
  type EditingItem,
  type EditingItemProps,
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
export {
  useTreeEditing,
  type TreeEditing,
  type TreeEditingKeyboardOptions,
  type UseTreeEditingOptions,
} from "./use-tree-editing.js";
export {
  useVirtualSelectionScope,
  type UseVirtualSelectionScopeOptions,
} from "./use-virtual-selection-scope.js";
export {
  useAnchoredFloatingPosition,
  type AnchoredFloatingPositionBinding,
  type UseAnchoredFloatingPositionOptions,
} from "./use-anchored-floating-position.js";

export function useJSONDocumentValue(document: JSONDocument): JSONValue {
  const store = useMemo(() => {
    let current = document.value;
    return {
      subscribe: (notify: () => void) => document.subscribe(() => notify()),
      getSnapshot() {
        const latest = document.value;
        if (!jsonEqual(current, latest)) current = latest;
        return current;
      },
    };
  }, [document]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
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
