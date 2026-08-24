import { useMemo, useRef, useState } from "react";
import {
  createTreeEditor,
  type TreeDocument,
  type TreeNode,
  type TreeTopology,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  activeDescendantContainerProps,
  activeDescendantItemProps,
  lineBoundary,
  moveLinePoint,
  projectWebWidgetState,
} from "@interactive-os/json-document-web";
import { SelectableItem } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import {
  editingCommandFromWebKeyboardStroke,
  applyAffordance,
  treeAffordance,
} from "@interactive-os/json-document-affordance";
import { optionProps, useWidgetKeyboard } from "../../shared/widget-binding";
import { WidgetDemoFrame } from "./WidgetDemoFrame";

const initialTree: TreeDocument = {
  nodes: [
    { id: "fruit", parentId: null, label: "Fruit" },
    { id: "apple", parentId: "fruit", label: "Apple" },
    { id: "pear", parentId: "fruit", label: "Pear" },
    { id: "veg", parentId: null, label: "Vegetables" },
    { id: "kale", parentId: "veg", label: "Kale" },
  ],
};

export function TreeWidgetRoute() {
  const containerRef = useRef<HTMLUListElement>(null);
  const [editor] = useState(() => createTreeEditor(initialTree));
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(["fruit", "veg"]));
  const keyboard = useWidgetKeyboard();
  const document = editor.snapshot.value as TreeDocument;
  const rows = useMemo(() => walkVisible(document.nodes, expanded), [document.nodes, expanded]);
  const topology: TreeTopology = { visibleIds: rows.map((row) => row.id) };
  const focusKey = editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.nodeId ?? null;
  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedNodeIdsIn(topology),
    focusKey,
    onSelect: (nodeId, mode) => {
      editor.dispatch({ type: "selection.set", nodeId, topology, mode });
    },
    keyboard: {
      resolve: (stroke) => {
        keyboard.resolve(stroke);
        return editingCommandFromWebKeyboardStroke(stroke);
      },
      focusKey: () => editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.nodeId ?? undefined,
      neighbor: (key, command) => {
        const row = rows.find((item) => item.id === key);
        if (row && command.type === "move") {
          let stay = false;
          applyAffordance(
            treeAffordance(command, {
              expanded: expanded.has(row.id),
              hasChildren: document.nodes.some((node) => node.parentId === row.id),
            }),
            {
              hand: (hand) => {
                if (hand.type === "expand") {
                  setExpanded((current) => new Set(current).add(row.id));
                  stay = true;
                }
                if (hand.type === "collapse") {
                  setExpanded((current) => {
                    const next = new Set(current);
                    next.delete(row.id);
                    return next;
                  });
                  stay = true;
                }
              },
            },
          );
          if (stay) return key;
        }
        return command.type === "move"
          ? treeNeighbor(rows, key, command.direction)
          : lineBoundary(topology.visibleIds, command.edge);
      },
      onDelete: () => {
        editor.dispatch({ type: "selection.remove", topology });
      },
      onUndo: () => {
        editor.undo();
      },
      onRedo: () => {
        editor.redo();
      },
    },
  });

  return (
    <WidgetDemoFrame
      title="Tree"
      description="Expand, collapse, and select use applyAffordance. Fold stays on the host."
      illustration="branch"
      widgetLabel="Tree"
      widget={(
        <ul
          ref={containerRef}
          role="tree"
          aria-multiselectable="true"
          aria-label="Visible nodes"
          {...activeDescendantContainerProps(focusKey === null ? null : treeItemId(focusKey))}
          onKeyDown={editing.getKeyDownHandler()}
          className={classes("m-0 grid list-none gap-1 p-0", ui.state.focus)}
        >
          {rows.map((row) => {
            const childCount = document.nodes.filter((node) => node.parentId === row.id).length;
            return (
              <li role="none" key={row.id} style={{ paddingLeft: `${row.depth * 1.25}rem` }}>
                  <SelectableItem
                    as="div"
                    className={classes("grid grid-cols-[2rem_minmax(0,1fr)] text-left", ui.surface.selectableBlock)}
                    {...optionProps(editing.getItem(row.id))}
                    {...activeDescendantItemProps(treeItemId(row.id))}
                    {...projectWebWidgetState({
                      role: "treeitem",
                      selected: editing.getItem(row.id).getIsSelected(),
                      expanded: childCount > 0 ? expanded.has(row.id) : undefined,
                      level: row.depth + 1,
                      posInSet: row.posInSet,
                      setSize: row.setSize,
                    })}
                    onClick={(event) => {
                      containerRef.current?.focus();
                      editing.getItem(row.id).getPressHandler()(event);
                    }}
                  >
                    <span aria-hidden="true">{childCount > 0 ? expanded.has(row.id) ? "−" : "+" : ""}</span>
                    <span>{row.label}</span>
                  </SelectableItem>
              </li>
            );
          })}
        </ul>
      )}
      values={[
        { label: "topology", value: topology, testId: "widget-tree-topology", size: "compact" },
        { label: "selectedKeys", value: editor.selectedNodeIdsIn(topology), testId: "widget-tree-selected", size: "compact" },
        { label: "focus", value: focusKey, testId: "widget-tree-focus", size: "compact" },
        { label: "keyboard", value: keyboard.lastCommand, testId: "widget-tree-keyboard", size: "compact" },
      ]}
    />
  );
}

function treeItemId(nodeId: string): string {
  return `widget-tree-item-${nodeId}`;
}

function walkVisible(
  nodes: ReadonlyArray<TreeNode>,
  expanded: ReadonlySet<string>,
): ReadonlyArray<TreeRow> {
  const byParent = new Map<string | null, TreeNode[]>();
  for (const node of nodes) {
    const siblings = byParent.get(node.parentId) ?? [];
    siblings.push(node);
    byParent.set(node.parentId, siblings);
  }
  const rows: TreeRow[] = [];
  function visit(parentId: string | null, depth: number) {
    const siblings = byParent.get(parentId) ?? [];
    siblings.forEach((node, index) => {
      rows.push({ ...node, depth, posInSet: index + 1, setSize: siblings.length });
      if (expanded.has(node.id)) visit(node.id, depth + 1);
    });
  }
  visit(null, 0);
  return rows;
}

type TreeRow = TreeNode & {
  readonly depth: number;
  readonly posInSet: number;
  readonly setSize: number;
};

function treeNeighbor(
  rows: ReadonlyArray<TreeRow>,
  key: string,
  direction: "previous" | "next" | "up" | "down" | "left" | "right",
): string | null {
  const row = rows.find((item) => item.id === key);
  if (row === undefined) return null;
  if (direction === "left") return row.parentId;
  if (direction === "right") {
    return rows.find((item) => item.parentId === row.id)?.id ?? null;
  }
  return moveLinePoint(rows.map((item) => item.id), key, direction);
}
