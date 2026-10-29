import { useState } from "react";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { CopyPlus, Trash2, Sparkles } from "lucide-react";
import { Command, Toolbar } from "@interactive-os/json-document-ui-primitives-react";
import type { ObjectEditor } from "@interactive-os/json-document-editing";
import { readCanvasHTML } from "@interactive-os/json-document-editing";
import type { CanvasDocument } from "@interactive-os/json-document-object-document";
import { CanvasHTMLObject } from "./canvas-html-object.js";
import type { CanvasEditTarget } from "./canvas-edit-target.js";

/** A scrollable page projection of HTML objects; commands/history stay in ObjectEditor. */
export function CanvasPages({ editor, selectedId, onSelect, onRequestEdit }: {
  readonly editor: ObjectEditor;
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onRequestEdit: (target: CanvasEditTarget) => void;
}) {
  const snapshot = useEditingSnapshot(editor);
  const [editingId, setEditingId] = useState<string | null>(null);
  const pages = (snapshot.value as CanvasDocument).objects.filter(object => readCanvasHTML(object) !== null);
  return <div data-canvas-pages>
    {pages.map((page, index) => page.kind === "embedded-document" && <section key={page.id} data-canvas-page={page.id} data-selected={selectedId === page.id} aria-label={`페이지 ${index + 1}`}>
      <header data-canvas-page-heading>
        <Command aria-pressed={selectedId === page.id} onClick={() => { onSelect(page.id); setEditingId(null); }}>{String(index + 1).padStart(2, "0")} · {page.label || "제목 없는 페이지"}</Command>
        <Toolbar label={`페이지 ${index + 1} 작업`}>
          <Command label="페이지 복제" onClick={() => { const result = editor.dispatch({ type: "object.duplicate", objectIds: [page.id] }); if (result.ok && editor.snapshot.selection.primaryKey) onSelect(editor.snapshot.selection.primaryKey); }}><CopyPlus size={16} aria-hidden="true" /></Command>
          <Command label="페이지 삭제" onClick={() => { editor.dispatch({ type: "object.remove", objectIds: [page.id] }); }}><Trash2 size={16} aria-hidden="true" /></Command>
          <Command label="페이지 AI에게 수정 요청" onClick={() => { onSelect(page.id); onRequestEdit({ objectIds: [page.id], label: page.label || `페이지 ${index + 1}` }); }}><Sparkles size={16} aria-hidden="true" /></Command>
        </Toolbar>
      </header>
      <div data-canvas-page-sheet onPointerDownCapture={() => { onSelect(page.id); setEditingId(page.id); }}>
        <svg viewBox={`${page.x} ${page.y} ${page.width} ${page.height}`} style={{ width: "100%", aspectRatio: `${page.width} / ${page.height}`, display: "block" }} role="group" aria-label={`페이지 ${index + 1} 내용`}>
          <CanvasHTMLObject object={page} editor={editor} active={selectedId === page.id && editingId === page.id} onDeactivate={() => setEditingId(null)} onRequestEdit={onRequestEdit} />
        </svg>
      </div>
    </section>)}
  </div>;
}
