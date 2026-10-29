import { createPortal } from "react-dom";
import { useAnchoredFloatingPosition } from "@interactive-os/json-document-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { readCanvasHTML, updateCanvasHTML, type ObjectEditor } from "@interactive-os/json-document-editing";
import type { CanvasObject } from "@interactive-os/json-document-object-document";
import { createWebHTMLArtifactSource, webCanvasHTMLAdapter, bindWebHTMLArtifactEditing, editWebHTMLArtifactNode, type WebHTMLNodeSelection, type WebHTMLNodeChange, measureWebHTMLReview, type WebHTMLReviewRequest, type WebHTMLReviewRegion } from "@interactive-os/json-document-web";
import { Command, Field, Toolbar, ToolbarGroup, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";

import { Braces, Check } from "lucide-react";
import { CanvasEditControls } from "./canvas-edit-controls.js";
import type { CanvasEditTarget } from "./canvas-edit-target.js";

/** HTML owns layout; Canvas binds node selection and edits back to authored source. */
export function CanvasHTMLObject({ object, editor, active, onDeactivate, onRequestEdit, geometryKey, review }: {
  readonly object: Extract<CanvasObject, { kind: "embedded-document" }>;
  readonly editor: ObjectEditor;
  readonly geometryKey?: string;
  readonly review?: { readonly requests: readonly WebHTMLReviewRequest[]; readonly onRegions: (regions: Record<string, WebHTMLReviewRegion[]>) => void };
  readonly active: boolean;
  readonly onDeactivate: () => void;
  readonly onRequestEdit?: (target: CanvasEditTarget) => void;
}) {
  const value = readCanvasHTML(object);
  const frame = useRef<HTMLIFrameElement>(null);
  const dispose = useRef<() => void>(() => {});
  const loadedSource = useRef<string | undefined>(undefined);
  const selectedId = useRef<string | undefined>(undefined);
  const [selection, setSelection] = useState<WebHTMLNodeSelection | null>(null);
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [sourceMode, setSourceMode] = useState(false);
  const [error, setError] = useState("");
  const position = useAnchoredFloatingPosition<HTMLDivElement, HTMLDivElement>({
    active: active && !sourceMode,
    geometryKey: `${geometryKey}:${selection?.id}:${selection?.x}:${selection?.y}:${selection?.width}:${selection?.height}:${object.x}:${object.y}:${object.width}:${object.height}`,
    policy: { type: "preferred", placement: "top", fallbacks: ["bottom"] }, offset: 10, boundaryPadding: 16,
  });
  const source = editingSource ?? value?.html ?? "";
  const rendered = useMemo(() => {
    try { return value ? { source: createWebHTMLArtifactSource(source) } : { error: "HTML 문서를 읽을 수 없습니다." }; }
    catch (error) { return { error: String(error) }; }
  }, [source, !!value]);
  const commit = (id: string, change: WebHTMLNodeChange) => {
    try {
      const html = editWebHTMLArtifactNode(source, id, change);
      const result = updateCanvasHTML(editor, object.id, source, html, webCanvasHTMLAdapter);
      if (!result.ok) { setError(result.code === "html.stale-source" ? "다른 편집이 반영됐습니다. 입력한 내용을 복사한 뒤 Escape로 취소하고 다시 편집해 주세요." : result.code); return false; }
      setError(""); return true;
    } catch (error) { setError(String(error)); return false; }
  };
  const reviewRef = useRef(review);
  reviewRef.current = review;
  const measureReview = () => {
    if (loadedSource.current !== rendered.source || !frame.current?.contentDocument || !reviewRef.current) return;
    reviewRef.current.onRegions(measureWebHTMLReview(frame.current.contentDocument, reviewRef.current.requests));
  };
  useEffect(() => { measureReview(); }, [review, rendered.source]);
  const bind = () => {
    dispose.current(); dispose.current = () => {};
    if (!active || sourceMode || !frame.current || loadedSource.current !== rendered.source) return;
    dispose.current = bindWebHTMLArtifactEditing(frame.current, {
      ...(selectedId.current ? { selectedId: selectedId.current } : {}),
      onSelect: selected => { selectedId.current = selected?.id; setSelection(selected); },
      onCommitText: (id, text) => commit(id, { text }),
      onEditingChange: editing => { setEditingSource(editing ? source : null); if (!editing) setError(""); },
      onHistory: action => { editor[action](); }, onExit: onDeactivate,
    });
  };
  useEffect(() => {
    bind();
    if (!active) { setSourceMode(false); setEditingSource(null); setSelection(null); setError(""); }
    return () => dispose.current();
  }, [active, rendered.source, sourceMode, editor, object.id]);
  const sx = value ? object.width / value.viewportWidth : 1, sy = value ? object.height / value.viewportHeight : 1;
  return <foreignObject x={object.x} y={object.y} width={object.width} height={object.height} data-canvas-html={object.id}>
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }} onPointerDown={event => { if (active) event.stopPropagation(); }}>
      {active && sourceMode && value ? <HTMLSourceEditor key={object.id} objectId={object.id} source={value.html} editor={editor} onDeactivate={() => setSourceMode(false)} />
        : rendered.source && value ? <>
          <iframe ref={frame} title={object.label || "HTML 디자인"} sandbox="allow-same-origin" referrerPolicy="no-referrer" tabIndex={active ? 0 : -1} srcDoc={rendered.source}
            onLoad={() => { loadedSource.current = rendered.source; bind(); measureReview(); }}
            style={{ border: 0, display: "block", width: value.viewportWidth, height: value.viewportHeight, transformOrigin: "0 0", transform: `scale(${sx}, ${sy})`, pointerEvents: active ? "auto" : "none" }} />
          {active && <div ref={position.anchorRef} aria-hidden="true" style={{ position: "absolute", left: (selection?.x ?? 0) * sx, top: (selection?.y ?? 0) * sy, width: (selection?.width ?? value.viewportWidth) * sx, height: (selection?.height ?? value.viewportHeight) * sy, pointerEvents: "none" }} />}
          {active && selection && <div data-html-node-selection={selection.id} aria-hidden="true" style={{ position: "absolute", left: selection.x * sx, top: selection.y * sy, width: selection.width * sx, height: selection.height * sy, outline: "1px solid rgb(var(--color-border-accent))", pointerEvents: "none" }} />}
          {active && frame.current && createPortal(<div ref={position.floatingRef} data-canvas-html-controls={object.id} onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} style={{ ...position.style, zIndex: 40 }}>
            <CanvasEditControls value={selection ? selection.editableText ? { textColor: selection.color, fontSize: selection.fontSize } : { color: selection.backgroundColor } : {}}
              onStyle={style => selection && commit(selection.id, { ...(style.textColor !== undefined ? { color: style.textColor } : {}), ...(style.color !== undefined ? { backgroundColor: style.color } : {}), ...(style.fontSize !== undefined ? { fontSize: style.fontSize } : {}) })}
              {...(onRequestEdit ? { onRequestEdit: () => onRequestEdit({ objectIds: [object.id], ...(selection ? { nodeId: selection.id } : {}), label: selection?.text.trim().slice(0, 60) || object.label || "HTML 콘텐츠" }) } : {})}>
              {!onRequestEdit && <Command label="HTML 소스" onClick={() => setSourceMode(true)}><Braces aria-hidden="true" size={16} /></Command>}
              <Command label="HTML 편집 마치기" onClick={onDeactivate}><Check aria-hidden="true" size={16} /></Command>
            </CanvasEditControls>
            {error && <p role="alert" style={{ background: "rgb(var(--color-background-canvas))", fontSize: 12 }}>{error}</p>}
          </div>, frame.current.ownerDocument.body)}
        </> : <div role="alert">{rendered.error}</div>}
    </div>
  </foreignObject>;
}

function HTMLSourceEditor({ objectId, source, editor, onDeactivate }: { objectId: string; source: string; editor: ObjectEditor; onDeactivate: () => void }) {
  const [base] = useState(source);
  const [draft, setDraft] = useState(source);
  const [error, setError] = useState("");
  const apply = () => {
    try {
      const result = updateCanvasHTML(editor, objectId, base, draft, webCanvasHTMLAdapter);
      if (!result.ok) { setError(result.code === "html.stale-source" ? "다른 편집이 반영됐습니다. 수정 내용을 복사한 뒤 취소하고 다시 열어 주세요." : result.code); return; }
      onDeactivate();
    } catch (error) { setError(String(error)); }
  };
  return <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "rgb(var(--color-background-canvas))", color: "rgb(var(--color-foreground-default))", userSelect: "text" }}
    onPointerDown={event => event.stopPropagation()} onKeyDown={event => {
      event.stopPropagation();
      if (event.nativeEvent.isComposing) return;
      if (event.key === "Escape") { event.preventDefault(); onDeactivate(); }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); apply(); }
    }}>
    <Field multiline autoFocus label="HTML/CSS 소스" value={draft} onValueChange={setDraft} spellCheck={false} style={{ flex: 1, minHeight: 0, width: "100%", fontFamily: "monospace", fontSize: 12, resize: "none" }} />
    {error && <p role="alert">{error}</p>}
    <ToolbarGroup><Command onClick={apply}>적용</Command><Command onClick={onDeactivate}>취소</Command></ToolbarGroup>
  </div>;
}
