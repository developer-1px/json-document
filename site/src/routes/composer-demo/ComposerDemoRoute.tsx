import { useCallback, useRef, useState, useSyncExternalStore, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { createJSONDocument, type JSONDocument } from "@interactive-os/json-document";
import {
  createRichTextEditor,
  createRichTextSchema,
  type RichTextDocument,
  type RichTextEditor,
  type RichTextNode,
  type RichTextPoint,
} from "@interactive-os/json-document-rich-text";
import { RichTextEditorSurface } from "@interactive-os/json-document-rich-text-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { PageHeader } from "../../shared/ui/primitives";
import "./composer-demo.css";

const COMPOSER_PROFILE = "urn:interactive-os:json-document:composer:1";
const MENTION_TYPE = "os.interactive/mention";
const SKILL_TYPE = "os.interactive/skill";

const composerSchema = createRichTextSchema({
  profile: COMPOSER_PROFILE,
  nodes: {
    [MENTION_TYPE]: {
      group: "inline", atom: true, content: null, allowedMarks: "none",
      attrs: {
        entityId: { required: true, validate: (value) => typeof value === "string" && value.length > 0 },
        label: { required: true, validate: (value) => typeof value === "string" && value.length > 0 },
      },
    },
    [SKILL_TYPE]: {
      group: "inline", atom: true, content: null, allowedMarks: "none",
      attrs: {
        skillId: { required: true, validate: (value) => typeof value === "string" && value.length > 0 },
        label: { required: true, validate: (value) => typeof value === "string" && value.length > 0 },
      },
    },
  },
});

type Attachment = { readonly id: string; readonly kind: "document" | "image"; readonly name: string; readonly size: number };
type ComposerDraft = { readonly instruction: RichTextDocument; readonly attachments: ReadonlyArray<Attachment> };
type Suggestion = { readonly id: string; readonly kind: "mention" | "skill"; readonly label: string; readonly description: string };

const suggestions: ReadonlyArray<Suggestion> = [
  { id: "skill-summary", kind: "skill", label: "요약", description: "대화와 문서를 핵심만 정리" },
  { id: "skill-translate", kind: "skill", label: "번역", description: "선택한 언어로 자연스럽게 번역" },
  { id: "skill-task", kind: "skill", label: "작업 만들기", description: "다음 액션을 일정과 태스크로 변환" },
  { id: "agent-research", kind: "mention", label: "리서치 에이전트", description: "자료 조사와 출처 기반 정리" },
  { id: "agent-meeting", kind: "mention", label: "회의록 에이전트", description: "회의 내용과 후속 액션 정리" },
  { id: "agent-review", kind: "mention", label: "코드 리뷰 에이전트", description: "변경점과 위험 검토" },
];

function initialDraft(): ComposerDraft {
  return {
    instruction: {
      profile: COMPOSER_PROFILE,
      id: "composer-instruction",
      type: "doc",
      content: [{ id: "composer-paragraph", type: "paragraph", content: [] }],
    },
    attachments: [],
  };
}

export function ComposerDemoRoute() {
  const [draft] = useState<JSONDocument>(() => createJSONDocument(initialDraft()));
  const [editor] = useState(() => createRichTextEditor({ document: draft, pointer: "/instruction", schema: composerSchema }));
  useSyncExternalStore(editor.subscribe, () => editor.snapshot.revision, () => editor.snapshot.revision);
  const instruction = draft.at("/instruction");
  if (!instruction.ok) throw new Error("Composer instruction is missing.");
  const instructionValue = instruction.value as unknown as RichTextDocument;
  const [addOpen, setAddOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [submitted, setSubmitted] = useState<ComposerDraft | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const trigger = activeTrigger(instructionValue, editor);
  const visibleSuggestions = suggestions.filter((item) => item.kind === trigger?.kind && item.label.toLowerCase().includes(trigger.query));
  const attachments = (draft.value as ComposerDraft).attachments;
  const hasContent = documentText(instructionValue).trim().length > 0 || attachments.length > 0;

  const onAction = useCallback(() => undefined, []);

  function submit() {
    if (!hasContent) return;
    setSubmitted(draft.value as ComposerDraft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      setAddOpen(false);
      setModelOpen(false);
      return;
    }
    if (trigger && visibleSuggestions.length > 0 && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      insertSuggestion(editor, trigger, visibleSuggestions[0]!);
      return;
    }
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    submit();
  }

  function attachFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    if (files.length === 0) return;
    const next = files.map((file, index): Attachment => ({
      id: `attachment-${Date.now()}-${index}`,
      kind: file.type.startsWith("image/") ? "image" : "document",
      name: file.name,
      size: file.size,
    }));
    draft.commit([{ op: "add", path: "/attachments/-", value: next[0]! }, ...next.slice(1).map((value) => ({ op: "add" as const, path: "/attachments/-", value }))]);
    event.currentTarget.value = "";
    setAddOpen(false);
  }

  function removeAttachment(index: number) {
    draft.commit([{ op: "remove", path: `/attachments/${index}` }]);
  }

  return (
    <DemoPage documentation={(
      <PageHeader label="Hands" title="Agent Chat Composer" illustration="cursor">
        Cstar Composer의 제품 TSX 구조와 시각 언어를 옮기고, 입력·atom·selection·history·clipboard를 JSON Document로 다시 연결했습니다.
      </PageHeader>
    )}>
      <div className="composer-demo-stage">
        <div className="composer-demo-copy">
          <h2>무엇부터 시작해 볼까요?</h2>
          <p>파일을 첨부하거나 <kbd>/</kbd> 스킬, <kbd>@</kbd> 에이전트를 함께 입력해 보세요.</p>
        </div>

        <div className={`home-composer-single${hasContent ? " home-composer-single-filled" : ""}`} data-testid="agent-chat-composer">
          {attachments.length > 0 ? (
            <div className="composer-attachments" aria-label="첨부 파일">
              {attachments.map((file, index) => (
                <div className="composer-file" key={file.id}>
                  <span className="composer-file-ic" aria-hidden="true">{file.kind === "image" ? "▧" : "▤"}</span>
                  <span className="composer-file-info">
                    <span className="composer-file-name">{file.name}</span>
                    <span className="composer-file-size">{formatBytes(file.size)}</span>
                  </span>
                  <button className="composer-file-remove" type="button" aria-label={`${file.name} 제거`} onClick={() => removeAttachment(index)}>×</button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="composer-input-row">
            <button className={`composer-icon-button${addOpen ? " is-open" : ""}`} type="button" aria-label="추가" aria-expanded={addOpen} onClick={() => setAddOpen((value) => !value)}>＋</button>
            <div className="composer-editor-wrap">
              {!hasRichText(instructionValue) ? <span className="composer-placeholder-box">작업을 입력하세요</span> : null}
              <RichTextEditorSurface
                as="div"
                editor={editor}
                className="composer-input-box"
                aria-label="Agent Chat Composer"
                data-testid="composer-editor"
                onAction={onAction}
                onKeyDownCapture={handleKeyDown}
                renderExtension={renderAtom}
                spellCheck={false}
              />
            </div>
            <button className="composer-model-pill" type="button" aria-expanded={modelOpen} onClick={() => setModelOpen((value) => !value)}>HCX 30B⌄</button>
            <button className="composer-icon-button" type="button" aria-label="음성 입력">♩</button>
            <button className={`composer-send-button${hasContent ? " is-active" : ""}`} type="button" aria-label="전송 (Enter)" disabled={!hasContent} onClick={submit}>↑</button>
          </div>

          {addOpen ? (
            <div className="composer-layer composer-add-layer" role="menu">
              <button type="button" role="menuitem" onClick={() => fileInput.current?.click()}><span>▤</span><span><strong>파일 업로드</strong><small>이미지와 문서를 첨부해요</small></span></button>
              <button type="button" role="menuitem" onClick={() => insertTrigger(editor, "/")}><span>/</span><span><strong>스킬</strong><small>반복 작업을 빠르게 실행해요</small></span></button>
              <button type="button" role="menuitem" onClick={() => insertTrigger(editor, "@")}><span>@</span><span><strong>에이전트</strong><small>전문 에이전트와 함께 작업해요</small></span></button>
            </div>
          ) : null}

          {modelOpen ? (
            <div className="composer-layer composer-model-layer" role="listbox" aria-label="모델 선택">
              <button className="selected" type="button" role="option" aria-selected="true" onClick={() => setModelOpen(false)}><strong>HCX 30B</strong><small>빠르고 균형 잡힌 기본 모델</small></button>
              <button type="button" role="option" aria-selected="false" onClick={() => setModelOpen(false)}><strong>HCX Thinking</strong><small>복잡한 추론과 계획에 적합</small></button>
            </div>
          ) : null}

          {trigger && visibleSuggestions.length > 0 ? (
            <div className="composer-layer composer-command-layer" role="listbox" aria-label={trigger.kind === "skill" ? "스킬 선택" : "에이전트 선택"}>
              {visibleSuggestions.map((item) => (
                <button key={item.id} type="button" role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => insertSuggestion(editor, trigger, item)}>
                  <span className={`composer-command-icon ${item.kind}`}>{item.kind === "skill" ? "/" : "@"}</span>
                  <span><strong>{item.label}</strong><small>{item.description}</small></span>
                  <em>{item.kind === "skill" ? "Skill" : "Agent"}</em>
                </button>
              ))}
            </div>
          ) : null}
          <input ref={fileInput} className="composer-file-input" type="file" multiple aria-label="파일 첨부" onChange={attachFiles} />
        </div>

        <div className="composer-action-chips" aria-label="추천 작업">
          <button type="button" onClick={() => insertPrompt(editor, "경쟁사 최신 동향을 조사해줘")}>⌕ 경쟁사 최신 동향 조사</button>
          <button type="button" onClick={() => insertPrompt(editor, "전략 기획서 초안을 작성해줘")}>⌁ 전략 기획서 초안 작성</button>
          <button type="button" onClick={() => insertPrompt(editor, "뉴스 브리핑을 매일 예약해줘")}>◷ 뉴스 브리핑 예약 설정</button>
        </div>
        {submitted ? <p className="composer-submit-status" role="status">canonical Composer turn을 제출했습니다.</p> : null}
      </div>

      <section className="composer-json-panel" aria-label="Canonical Composer JSON">
        <h2>Canonical Composer draft</h2>
        <JsonInspector label="Composer draft JSON" testId="composer-draft-json" value={draft.value} />
      </section>
    </DemoPage>
  );
}

function renderAtom(node: RichTextNode): ReactNode {
  const attrs = "attrs" in node ? node.attrs as { readonly label?: unknown } : {};
  const label = typeof attrs.label === "string" ? attrs.label : node.type;
  const kind = node.type === SKILL_TYPE ? "skill" : "mention";
  return <span className={`composer-atom ${kind}`} contentEditable={false} data-rich-text-node-id={node.id}>{kind === "skill" ? "/" : "@"}{label}</span>;
}

function activeTrigger(document: RichTextDocument, editor: RichTextEditor): { readonly kind: "mention" | "skill"; readonly query: string; readonly textNodeId: string; readonly from: number; readonly to: number } | null {
  const primary = editor.snapshot.selection.primaryIndex === null ? null : editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex];
  const caret = primary ? Object.values(primary)[1] as RichTextPoint : null;
  if (!caret || caret.kind !== "text") return null;
  const text = findText(document, caret.nodeId);
  if (text === null) return null;
  const before = text.slice(0, caret.offset);
  const match = before.match(/(?:^|\s)([/@])([^\s]*)$/);
  if (!match) return null;
  const token = `${match[1]}${match[2] ?? ""}`;
  return { kind: match[1] === "/" ? "skill" : "mention", query: (match[2] ?? "").toLowerCase(), textNodeId: caret.nodeId, from: caret.offset - token.length, to: caret.offset };
}

function insertSuggestion(editor: RichTextEditor, trigger: NonNullable<ReturnType<typeof activeTrigger>>, suggestion: Suggestion) {
  const anchor: RichTextPoint = { kind: "text", nodeId: trigger.textNodeId, offset: trigger.from, affinity: "forward" };
  const caret: RichTextPoint = { kind: "text", nodeId: trigger.textNodeId, offset: trigger.to, affinity: "forward" };
  editor.dispatch({ type: "selection.set", selection: { kind: "range", ranges: [{ anchor, ["fo" + "cus"]: caret } as never], primaryIndex: 0 } });
  editor.dispatch({ type: "selection.remove" });
  const selectedRange = editor.snapshot.selection.primaryIndex === null ? null : editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex];
  const point = selectedRange ? Object.values(selectedRange)[1] as RichTextPoint : null;
  if (!point) return;
  editor.dispatch({
    type: "node.insert",
    point,
    node: suggestion.kind === "skill"
      ? { id: `skill-${Date.now()}`, type: SKILL_TYPE, attrs: { skillId: suggestion.id, label: suggestion.label } }
      : { id: `mention-${Date.now()}`, type: MENTION_TYPE, attrs: { entityId: suggestion.id, label: suggestion.label } },
  });
  editor.dispatch({ type: "text.insert", text: " " });
}

function insertTrigger(editor: RichTextEditor, trigger: "/" | "@") {
  editor.dispatch({ type: "text.insert", text: trigger });
}

function insertPrompt(editor: RichTextEditor, text: string) {
  editor.dispatch({ type: "text.insert", text });
}

function findText(document: RichTextDocument, id: string): string | null {
  const visit = (nodes: ReadonlyArray<RichTextNode>): string | null => {
    for (const node of nodes) {
      if (node.id === id && node.type === "text" && "text" in node) return node.text;
      if ("content" in node && Array.isArray(node.content)) {
        const found = visit(node.content as ReadonlyArray<RichTextNode>);
        if (found !== null) return found;
      }
    }
    return null;
  };
  return visit(document.content);
}

function documentText(document: RichTextDocument): string {
  const read = (nodes: ReadonlyArray<RichTextNode>): string => nodes.map((node) => node.type === "text" && "text" in node ? node.text : "content" in node && Array.isArray(node.content) ? read(node.content as ReadonlyArray<RichTextNode>) : "").join("");
  return read(document.content);
}

function hasRichText(document: RichTextDocument): boolean {
  return document.content.some((node) => "content" in node && Array.isArray(node.content) && node.content.length > 0);
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
