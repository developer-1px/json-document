import { useCallback, useMemo, useState } from "react";
import type { JSONValue } from "@interactive-os/json-document";
import {
  projectTreeVisibility,
  treeVisibilityNeighbor,
  type EditingSnapshot,
  type TreeNode,
  type TreeTopology,
  type TreeVisibility,
} from "@interactive-os/json-document-editing";
import {
  useEditing,
  type EditingItem,
  type EditingKeyDownEvent,
  type EditingKeyboardOptions,
  type EditingSelectionMode,
  type UseEditingOptions,
} from "./use-editing.js";
import type { EditingSnapshotSource } from "./editing-snapshot.js";

export interface TreeEditingKeyboardOptions {
  readonly resolve: EditingKeyboardOptions<string>["resolve"];
  readonly focusNodeId: () => string | undefined;
  readonly onDelete?: (topology: TreeTopology) => void;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly afterMove?: (nodeId: string) => void;
  readonly ignoreCommand?: EditingKeyboardOptions<string>["ignoreCommand"];
}

export interface UseTreeEditingOptions<Selection extends JSONValue> {
  readonly source?: EditingSnapshotSource<Selection>;
  readonly nodes: ReadonlyArray<TreeNode>;
  readonly initialExpandedIds?: Iterable<string>;
  readonly selectedNodeIds: (topology: TreeTopology) => Iterable<string>;
  readonly focusNodeId?: string | null;
  readonly onSelect: (nodeId: string, mode: EditingSelectionMode, topology: TreeTopology) => void;
  readonly operationFromEvent?: UseEditingOptions<Selection>["operationFromEvent"];
  readonly ignorePress?: UseEditingOptions<Selection>["ignorePress"];
  readonly keyboard?: TreeEditingKeyboardOptions;
}

export interface TreeEditing<Selection extends JSONValue> {
  readonly snapshot: EditingSnapshot<Selection>;
  readonly visibility: TreeVisibility;
  readonly expandedIds: ReadonlySet<string>;
  getItem(nodeId: string): EditingItem;
  getKeyDownHandler(): (event: EditingKeyDownEvent) => void;
  isExpanded(nodeId: string): boolean;
  expand(nodeId: string): void;
  collapse(nodeId: string): void;
  toggle(nodeId: string): void;
}

/** Connects visible-tree projection, fold state, and the React editing loop. */
export function useTreeEditing<Selection extends JSONValue>(
  options: UseTreeEditingOptions<Selection>,
): TreeEditing<Selection> {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(options.initialExpandedIds),
  );
  const visibility = useMemo(
    () => projectTreeVisibility(options.nodes, expandedIds),
    [expandedIds, options.nodes],
  );
  const expand = useCallback((nodeId: string) => {
    setExpandedIds((current) => new Set(current).add(nodeId));
  }, []);
  const collapse = useCallback((nodeId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      next.delete(nodeId);
      return next;
    });
  }, []);
  const toggle = useCallback((nodeId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);
  const keyboard = options.keyboard;
  const editingKeyboard: EditingKeyboardOptions<string> | undefined = keyboard === undefined ? undefined : {
    resolve: keyboard.resolve,
    focusKey: keyboard.focusNodeId,
    neighbor: (nodeId, command) => {
      const row = visibility.rows.find((candidate) => candidate.id === nodeId);
      if (row !== undefined && command.type === "move") {
        if (command.direction === "right" && row.hasChildren && !row.expanded) {
          expand(nodeId);
          return nodeId;
        }
        if (command.direction === "left" && row.hasChildren && row.expanded) {
          collapse(nodeId);
          return nodeId;
        }
      }
      return treeVisibilityNeighbor(visibility, nodeId, command);
    },
    ...(keyboard.onDelete === undefined ? {} : { onDelete: () => keyboard.onDelete?.(visibility.topology) }),
    ...(keyboard.onUndo === undefined ? {} : { onUndo: keyboard.onUndo }),
    ...(keyboard.onRedo === undefined ? {} : { onRedo: keyboard.onRedo }),
    ...(keyboard.afterMove === undefined ? {} : { afterMove: keyboard.afterMove }),
    ...(keyboard.ignoreCommand === undefined ? {} : { ignoreCommand: keyboard.ignoreCommand }),
  };
  const editing = useEditing({
    ...(options.source === undefined ? {} : { source: options.source }),
    selectedKeys: options.selectedNodeIds(visibility.topology),
    focusKey: options.focusNodeId ?? null,
    onSelect: (nodeId, mode) => options.onSelect(nodeId, mode, visibility.topology),
    ...(options.operationFromEvent === undefined ? {} : { operationFromEvent: options.operationFromEvent }),
    ...(options.ignorePress === undefined ? {} : { ignorePress: options.ignorePress }),
    ...(editingKeyboard === undefined ? {} : { keyboard: editingKeyboard }),
  });

  return {
    snapshot: editing.snapshot,
    visibility,
    expandedIds,
    getItem: editing.getItem,
    getKeyDownHandler: editing.getKeyDownHandler,
    isExpanded: (nodeId) => expandedIds.has(nodeId),
    expand,
    collapse,
    toggle,
  };
}
