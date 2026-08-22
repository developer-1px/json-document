import { useMemo, useRef, useState, type ClipboardEvent } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import {
  createTreeEditor,
  type TreeClipboard,
  type TreeDocument,
  type TreeIntent,
  type TreeNode,
  type TreeTopology,
} from "@interactive-os/json-document-editing";
import { useEditing } from "@interactive-os/json-document-react";
import {
  createWebClipboardBinding,
  lineBoundary,
  moveLinePoint,
  treeClipboardCodec,
} from "@interactive-os/json-document-web";
import {
  applyAffordance,
  pointerSelect,
  treeAffordance,
} from "@interactive-os/json-document-affordance";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, IconButton, SelectableItem } from "../../shared/ui/interactive";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { editingCommandFromStroke, historyCommands, optionProps } from "../../shared/widget-binding";

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
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(["fruit", "veg"]));
  const [clipboard, setClipboard] = useState<TreeClipboard | null>(null);
  const [announcement, setAnnouncement] = useState("Ready");
  const [lastIntent, setLastIntent] = useState<TreeIntent | null>(null);
  const topology = useMemo(
    () => visibleTopology((editor.snapshot.value as TreeDocument).nodes, expanded),
    [editor.snapshot.value, expanded],
  );
  const rows = useMemo(
    () => walkVisible((editor.snapshot.value as TreeDocument).nodes, expanded),
    [editor.snapshot.value, expanded],
  );
  const topologyRef = useRef(topology);
  topologyRef.current = topology;
  const [webClipboard] = useState(() => createWebClipboardBinding({
    codec: treeClipboardCodec,
    read: () => editor.copy(topologyRef.current),
    cut: () => editor.cut(topologyRef.current)?.result ?? { ok: false, code: "selection.empty" },
    paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload, topology: topologyRef.current }),
  }));

  function run(intent: TreeIntent, message: string) {
    const result = editor.dispatch(intent);
    setLastIntent(intent);
    setAnnouncement(result.ok ? message : result.code);
    return result;
  }

  const editing = useEditing({
    source: editor,
    selectedKeys: editor.selectedNodeIdsIn(topology),
    focusKey: editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.nodeId ?? null,
    onSelect: (nodeId, mode) => {
      run({ type: "selection.set", nodeId, topology, mode }, "Selection changed");
    },
    keyboard: {
      resolve: (stroke) => editingCommandFromStroke(stroke),
      focusKey: () => editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex ?? 0]?.focus.nodeId ?? undefined,
      neighbor: (key, command) => {
        const row = rows.find((item) => item.id === key);
        const nodes = (editor.snapshot.value as TreeDocument).nodes;
        if (row && command.type === "move") {
          let stay = false;
          applyAffordance(
            treeAffordance(command, {
              expanded: expanded.has(row.id),
              hasChildren: nodes.some((node) => node.parentId === row.id),
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
        run({ type: "selection.remove", topology }, "Selection deleted");
      },
      onUndo: () => {
        editor.undo();
        setAnnouncement("Undone");
      },
      onRedo: () => {
        editor.redo();
        setAnnouncement("Redone");
      },
    },
  });
  const snapshot = editing.snapshot;
  const document = snapshot.value as TreeDocument;
  const commands = historyCommands(snapshot);

  function copySelection() {
    const next = editor.copy(topology);
    if (!next) return setAnnouncement("Select a visible node first");
    setClipboard(next);
    setAnnouncement(`Copied ${next.nodes.length} node${next.nodes.length === 1 ? "" : "s"}`);
  }

  function cutSelection() {
    const result = editor.cut(topology);
    if (!result) return setAnnouncement("Select a visible node first");
    setClipboard(result.clipboard);
    setAnnouncement(`Cut ${result.clipboard.nodes.length} node${result.clipboard.nodes.length === 1 ? "" : "s"}`);
  }

  function handleNativeCopy(event: ClipboardEvent<HTMLUListElement>) {
    const result = webClipboard.copy(event);
    if (!result.ok) return setAnnouncement(result.code);
    setClipboard(result.payload);
    setAnnouncement(`Copied ${result.payload.nodes.length} structured node${result.payload.nodes.length === 1 ? "" : "s"}`);
  }

  function handleNativeCut(event: ClipboardEvent<HTMLUListElement>) {
    const result = webClipboard.cut(event);
    if (!result.ok) return setAnnouncement(result.code);
    setClipboard(result.payload);
    setAnnouncement(`Cut ${result.payload.nodes.length} structured node${result.payload.nodes.length === 1 ? "" : "s"}`);
  }

  function handleNativePaste(event: ClipboardEvent<HTMLUListElement>) {
    const result = webClipboard.paste(event);
    setAnnouncement(result.ok
      ? `Pasted ${result.payload.nodes.length} structured node${result.payload.nodes.length === 1 ? "" : "s"}`
      : result.code);
  }

  function toggle(nodeId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  return (
    <DemoPage documentation={(
      <PageHeader
        illustration="branch"
        title="Tree"
        aside={(
          <div className={classes("text-right", ui.text.meta)}>
            <div>{editor.selectedNodeIdsIn(topology).length} selected · revision {snapshot.revision}</div>
            <div aria-live="polite">{announcement}</div>
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
            <ActionButton disabled={commands.undo.disabled} onClick={() => { editor.undo(); setAnnouncement("Undone"); }}>Undo</ActionButton>
            <ActionButton disabled={commands.redo.disabled} onClick={() => { editor.redo(); setAnnouncement("Redone"); }}>Redo</ActionButton>
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
            onCopy={handleNativeCopy}
            onCut={handleNativeCut}
            onPaste={handleNativePaste}
            onKeyDown={editing.getKeyDownHandler()}
          >
            {walkVisible(document.nodes, expanded).map((row) => {
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
                      data-node-id={row.id}
                      className={classes("text-left", ui.surface.documentBlock)}
                      {...optionProps(editing.getItem(row.id))}
                      onClick={(event) => {
                        applyAffordance(pointerSelect(event), {
                          hand: (hand) => {
                            if (hand.type !== "select") return;
                            run({ type: "selection.set", nodeId: row.id, topology, mode: hand.operation }, "Selection changed");
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
          <p className={classes("mb-0 mt-3", ui.text.meta)}>Fold a branch to take it out of the visible line. Selection and clipboard read that line only.</p>
        </section>
      </ProductApp>
    </DemoPage>
  );
}

function visibleTopology(nodes: ReadonlyArray<TreeNode>, expanded: ReadonlySet<string>): TreeTopology {
  return { visibleIds: walkVisible(nodes, expanded).map((row) => row.id) };
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
