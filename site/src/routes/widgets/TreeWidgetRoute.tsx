import { useMemo, useState } from "react";
import {
  createTreeEditor,
  type TreeDocument,
  type TreeNode,
  type TreeTopology,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import { lineBoundary, moveLinePoint } from "@interactive-os/json-document-web";
import { IconButton, SelectableItem } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import {
  applyAffordance,
  keyboardCommandFrom,
  pointerSelect,
  resolveAffordanceKey,
  treeAffordance,
} from "@interactive-os/json-document-affordance";
import { treeItemProps, useWidgetKeyboard } from "../../shared/widget-binding";
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
        const result = resolveAffordanceKey(stroke);
        keyboard.resolve(stroke);
        return keyboardCommandFrom(result);
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
          ? moveLinePoint(topology.visibleIds, key, command.direction)
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

  function toggle(nodeId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  return (
    <WidgetDemoFrame
      title="Tree"
      description="Expand, collapse, and select use the same { hand, cursor, commit } result. Fold stays on the host."
      illustration="branch"
      widgetLabel="Tree"
      widget={(
        <ul
          role="tree"
          aria-multiselectable="true"
          aria-label="Visible nodes"
          tabIndex={0}
          onKeyDown={editing.getKeyDownHandler()}
          className={classes("m-0 grid list-none gap-1 p-0", ui.state.focus)}
        >
          {rows.map((row) => {
            const childCount = document.nodes.filter((node) => node.parentId === row.id).length;
            return (
              <li key={row.id} style={{ paddingLeft: `${row.depth * 1.25}rem` }}>
                <div className="grid grid-cols-[2rem_minmax(0,1fr)]">
                  {childCount > 0 ? (
                    <IconButton
                      label={expanded.has(row.id) ? `Collapse ${row.label}` : `Expand ${row.label}`}
                      onClick={() => toggle(row.id)}
                    >
                      {expanded.has(row.id) ? "−" : "+"}
                    </IconButton>
                  ) : <span />}
                  <SelectableItem
                    className={classes("text-left", ui.surface.selectableBlock)}
                    {...treeItemProps(editing.getItem(row.id))}
                    onClick={(event) => {
                      applyAffordance(pointerSelect(event), {
                        hand: (hand) => {
                          if (hand.type !== "select") return;
                          editor.dispatch({
                            type: "selection.set",
                            nodeId: row.id,
                            topology,
                            mode: hand.operation,
                          });
                        },
                      });
                    }}
                  >
                    {row.label}
                  </SelectableItem>
                </div>
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

function walkVisible(
  nodes: ReadonlyArray<TreeNode>,
  expanded: ReadonlySet<string>,
): ReadonlyArray<TreeNode & { readonly depth: number }> {
  const byParent = new Map<string | null, TreeNode[]>();
  for (const node of nodes) {
    const siblings = byParent.get(node.parentId) ?? [];
    siblings.push(node);
    byParent.set(node.parentId, siblings);
  }
  const rows: Array<TreeNode & { readonly depth: number }> = [];
  function visit(parentId: string | null, depth: number) {
    for (const node of byParent.get(parentId) ?? []) {
      rows.push({ ...node, depth });
      if (expanded.has(node.id)) visit(node.id, depth + 1);
    }
  }
  visit(null, 0);
  return rows;
}
