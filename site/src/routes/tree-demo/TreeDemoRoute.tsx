import { useRef, useState } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import {
  createTreeEditor,
  type TreeClipboard,
  type TreeDocument,
  type TreeIntent,
} from "@interactive-os/json-document-editing";
import { useEditingObservation, useTreeEditing } from "@interactive-os/json-document-react";
import {
  createWebClipboardSurface,
  treeClipboardCodec,
} from "@interactive-os/json-document-web";
import {
  historyAffordance,
  editingCommandFromWebKeyboardStroke,
} from "@interactive-os/json-document-affordance";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, IconButton, SelectableItem } from "../../shared/ui/interactive";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { optionProps } from "../../shared/widget-binding";

const initialTree: TreeDocument = {
  nodes: [
    { id: "fruit", parentId: null, label: "Fruit" },
    { id: "apple", parentId: "fruit", label: "Apple" },
    { id: "pear", parentId: "fruit", label: "Pear" },
    { id: "veg", parentId: null, label: "Vegetables" },
    { id: "kale", parentId: "veg", label: "Kale" },
    { id: "pea", parentId: "veg", label: "Pea" },
  ],
};

export function TreeDemoRoute() {
  const [editor] = useState(() => createTreeEditor(initialTree));
  const [clipboard, setClipboard] = useState<TreeClipboard | null>(null);
  const observation = useEditingObservation<TreeIntent>("Ready");

  function run(intent: TreeIntent, message: string) {
    return observation.dispatch(intent, editor.dispatch, message);
  }

  const document = editor.snapshot.value as TreeDocument;
  const focusNodeId = editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.nodeId ?? null;
  const editing = useTreeEditing({
    source: editor,
    nodes: document.nodes,
    initialExpandedIds: ["fruit", "veg"],
    selectedNodeIds: (topology) => editor.selectedNodeIdsIn(topology),
    focusNodeId,
    onSelect: (nodeId, mode, topology) => {
      run({ type: "selection.set", nodeId, topology, mode }, "Selection changed");
    },
    keyboard: {
      resolve: (stroke) => editingCommandFromWebKeyboardStroke(stroke),
      focusNodeId: () => editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.nodeId ?? undefined,
      onDelete: (topology) => {
        run({ type: "selection.remove", topology }, "Selection deleted");
      },
      onUndo: () => {
        editor.undo();
        observation.announce("Undone");
      },
      onRedo: () => {
        editor.redo();
        observation.announce("Redone");
      },
    },
  });
  const { rows, topology } = editing.visibility;
  const topologyRef = useRef(topology);
  topologyRef.current = topology;
  const [clipboardSurface] = useState(() => createWebClipboardSurface({
    codec: treeClipboardCodec,
    read: () => editor.copy(topologyRef.current),
    cut: () => editor.cut(topologyRef.current)?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload, topology: topologyRef.current }),
    onResult(result) {
      if (!result.ok) return observation.announce(result.code);
      if (result.operation !== "paste") setClipboard(result.payload);
      const verb = result.operation === "copy" ? "Copied" : result.operation === "cut" ? "Cut" : "Pasted";
      observation.announce(`${verb} ${result.payload.nodes.length} structured node${result.payload.nodes.length === 1 ? "" : "s"}`);
    },
  }));
  const snapshot = editing.snapshot;
  const commands = historyAffordance(snapshot).hand;

  function copySelection() {
    const next = editor.copy(topology);
    if (!next) return observation.announce("Select a visible node first");
    setClipboard(next);
    observation.announce(`Copied ${next.nodes.length} node${next.nodes.length === 1 ? "" : "s"}`);
  }

  function cutSelection() {
    const result = editor.cut(topology);
    if (!result) return observation.announce("Select a visible node first");
    setClipboard(result.clipboard);
    observation.announce(`Cut ${result.clipboard.nodes.length} node${result.clipboard.nodes.length === 1 ? "" : "s"}`);
  }

  return (
    <DemoPage documentation={(
      <PageHeader
        illustration="branch"
        title="Tree"
        aside={(
          <div className={classes("text-right", ui.text.meta)}>
            <div>{editor.selectedNodeIdsIn(topology).length} selected · revision {snapshot.revision}</div>
            <div aria-live="polite">{observation.announcement}</div>
          </div>
        )}
      >
        A folded tree. The host owns expand state and sends only the visible ID line to the editor.
      </PageHeader>

    )}>
      <ProductApp
        toolbarLabel="Tree actions"
        toolbar={(
          <>
            <ActionButton onClick={copySelection}>Copy</ActionButton>
            <ActionButton onClick={cutSelection}>Cut</ActionButton>
            <ActionButton
              disabled={!clipboard}
              onClick={() => {
                if (!clipboard) return;
                run({ type: "clipboard.paste", clipboard, topology }, `Pasted ${clipboard.nodes.length} node${clipboard.nodes.length === 1 ? "" : "s"}`);
              }}
            >
              Paste
            </ActionButton>
            <ActionButton onClick={() => run({ type: "selection.remove", topology }, "Selection deleted")}>Delete</ActionButton>
            <span className={classes("mx-1 w-px", ui.surface.separator)} aria-hidden="true" />
            <ActionButton disabled={commands.undo.disabled} onClick={() => { editor.undo(); observation.announce("Undone"); }}>Undo</ActionButton>
            <ActionButton disabled={commands.redo.disabled} onClick={() => { editor.redo(); observation.announce("Redone"); }}>Redo</ActionButton>
          </>
        )}
        inspector={(
          <Inspector placement="inline" items={[
            { label: "Canonical JSON", value: snapshot.value, testId: "tree-demo-document", size: "tall" },
            { label: "visibleIds", value: topology.visibleIds, testId: "tree-demo-visible", size: "compact" },
            { label: "selection", value: snapshot.selection, testId: "tree-demo-selection", size: "compact" },
          ]} />
        )}
      >
        <section aria-label="Editable tree">
          <ul
            className="m-0 grid list-none gap-1 p-0"
            tabIndex={0}
            {...clipboardSurface}
            onKeyDown={editing.getKeyDownHandler()}
          >
            {rows.map((row) => {
              return (
                <li key={row.id} style={{ paddingLeft: `${row.depth * 1.25}rem` }}>
                  <div className="grid grid-cols-[2rem_minmax(0,1fr)]">
                    {row.hasChildren ? (
                      <IconButton
                        label={row.expanded ? `Collapse ${row.label}` : `Expand ${row.label}`}
                        onClick={() => editing.toggle(row.id)}
                      >
                        {row.expanded ? "−" : "+"}
                      </IconButton>
                    ) : <span />}
                    <SelectableItem
                      data-node-id={row.id}
                      className={classes("text-left", ui.surface.documentBlock)}
                      {...optionProps(editing.getItem(row.id))}
                    >
                      {row.label}
                    </SelectableItem>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className={classes("mb-0 mt-3", ui.text.meta)}>Fold a branch to take it out of the visible line. Selection and clipboard read that line only.</p>
        </section>
      </ProductApp>
    </DemoPage>
  );
}
