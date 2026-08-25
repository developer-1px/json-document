import { useRef, useState } from "react";
import {
  createTreeEditor,
  type TreeDocument,
} from "@interactive-os/json-document-editing";
import { useTreeEditing } from "@interactive-os/json-document-react";
import {
  activeDescendantContainerProps,
  activeDescendantItemProps,
  projectWebWidgetState,
} from "@interactive-os/json-document-web";
import { SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../../shared/ui/styles";
import {
  editingCommandFromWebKeyboardStroke,
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
  const keyboard = useWidgetKeyboard();
  const document = editor.snapshot.value as TreeDocument;
  const focusKey = editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.nodeId ?? null;
  const editing = useTreeEditing({
    source: editor,
    nodes: document.nodes,
    initialExpandedIds: ["fruit", "veg"],
    selectedNodeIds: (topology) => editor.selectedNodeIdsIn(topology),
    focusNodeId: focusKey,
    onSelect: (nodeId, mode, topology) => {
      editor.dispatch({ type: "selection.set", nodeId, topology, mode });
    },
    keyboard: {
      resolve: (stroke) => {
        keyboard.resolve(stroke);
        return editingCommandFromWebKeyboardStroke(stroke);
      },
      focusNodeId: () => editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.nodeId ?? undefined,
      onDelete: (topology) => {
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
  const { rows, topology } = editing.visibility;

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
                      expanded: row.hasChildren ? row.expanded : undefined,
                      level: row.depth + 1,
                      posInSet: row.posInSet,
                      setSize: row.setSize,
                    })}
                    onClick={(event) => {
                      containerRef.current?.focus();
                      editing.getItem(row.id).getPressHandler()(event);
                    }}
                  >
                    <span aria-hidden="true">{row.hasChildren ? row.expanded ? "−" : "+" : ""}</span>
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
