import { useMemo, useState, type MouseEvent } from "react";
import {
  createTreeEditor,
  type TreeClipboard,
  type TreeDocument,
  type TreeIntent,
  type TreeNode,
  type TreeTopology,
} from "@interactive-os/json-document-editing";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { selectionOperationFromModifiers } from "@interactive-os/json-document-web";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "../../shared/ui/interactive";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

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
  const snapshot = useEditingSnapshot(editor);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(["fruit", "veg"]));
  const [clipboard, setClipboard] = useState<TreeClipboard | null>(null);
  const [announcement, setAnnouncement] = useState("Ready");
  const [lastIntent, setLastIntent] = useState<TreeIntent | null>(null);
  const document = snapshot.value as TreeDocument;
  const topology = useMemo(() => visibleTopology(document.nodes, expanded), [document.nodes, expanded]);
  const selected = new Set(editor.selectedNodeIdsIn(topology));

  function run(intent: TreeIntent, message: string) {
    const result = editor.dispatch(intent);
    setLastIntent(intent);
    setAnnouncement(result.ok ? message : result.code);
    return result;
  }

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

  function handleClick(event: MouseEvent, nodeId: string) {
    run({
      type: "selection.set",
      nodeId,
      topology,
      mode: selectionOperationFromModifiers(event),
    }, "Selection changed");
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
    <PageFrame>
      <PageHeader
        illustration="branch"
        title="Tree"
        aside={(
          <div className={classes("text-right", ui.text.meta)}>
            <div>{selected.size} selected · revision {snapshot.revision}</div>
            <div aria-live="polite">{announcement}</div>
          </div>
        )}
      >
        A folded tree. The host owns expand state and sends only the visible ID line to the editor.
      </PageHeader>

      <div className={classes("mb-3 flex flex-wrap gap-1 p-2", ui.surface.workspace)} role="toolbar" aria-label="Tree actions">
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
        <ActionButton disabled={!snapshot.canUndo} onClick={() => { editor.undo(); setAnnouncement("Undone"); }}>Undo</ActionButton>
        <ActionButton disabled={!snapshot.canRedo} onClick={() => { editor.redo(); setAnnouncement("Redone"); }}>Redo</ActionButton>
      </div>

      <section aria-label="Editable tree" className={classes("p-3", ui.surface.raised)}>
        <ul className="m-0 grid list-none gap-1 p-0">
          {walkVisible(document.nodes, expanded).map((row) => {
            const childCount = document.nodes.filter((node) => node.parentId === row.id).length;
            return (
              <li key={row.id} style={{ paddingLeft: `${row.depth * 1.25}rem` }}>
                <div className="grid grid-cols-[2rem_minmax(0,1fr)]">
                  {childCount > 0 ? (
                    <ActionButton
                      aria-label={expanded.has(row.id) ? `Collapse ${row.label}` : `Expand ${row.label}`}
                      onClick={() => toggle(row.id)}
                    >
                      {expanded.has(row.id) ? "−" : "+"}
                    </ActionButton>
                  ) : <span />}
                  <SelectableItem
                    selected={selected.has(row.id)}
                    data-node-id={row.id}
                    onClick={(event) => handleClick(event, row.id)}
                    className={classes("text-left", ui.surface.documentBlock)}
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

      <section className={classes("mt-4 p-3", ui.surface.raised)}>
        <Inspector items={[
          { label: "Canonical JSON", value: snapshot.value, testId: "tree-demo-document", size: "tall" },
          { label: "visibleIds", value: topology.visibleIds, testId: "tree-demo-visible", size: "compact" },
          { label: "selection", value: snapshot.selection, testId: "tree-demo-selection", size: "compact" },
        ]} />
      </section>
    </PageFrame>
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
