import { useCallback, useRef, useState, useSyncExternalStore, type ChangeEvent, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import { createJSONDocument, type JSONDocument } from "@interactive-os/json-document";
import { FileDropRegion, Menu, Select, useListbox } from "@interactive-os/json-document-ui-primitives-react";
import {
  createRichTextEditor,
  type RichTextDocument,
  type RichTextNode,
} from "@interactive-os/json-document-rich-text";
import { RichTextEditorSurface } from "@interactive-os/json-document-rich-text-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { PageHeader } from "../../shared/ui/primitives";
import {
  activeComposerTrigger,
  composerAttachments,
  composerDocumentText,
  composerSchema,
  createComposerDraft,
  hasComposerRichText,
  insertComposerSuggestion,
  insertComposerText,
  MENTION_TYPE,
  SKILL_TYPE,
  type ComposerDraft,
  type ComposerSuggestion,
} from "./composer-hands";
import "./composer-demo.css";

const suggestions: ReadonlyArray<ComposerSuggestion> = [
  { id: "skill-summary", kind: "skill", label: "요약", description: "대화와 문서를 핵심만 정리" },
  { id: "skill-translate", kind: "skill", label: "번역", description: "선택한 언어로 자연스럽게 번역" },
  { id: "skill-task", kind: "skill", label: "작업 만들기", description: "다음 액션을 일정과 태스크로 변환" },
  { id: "agent-research", kind: "mention", label: "리서치 에이전트", description: "자료 조사와 출처 기반 정리" },
  { id: "agent-meeting", kind: "mention", label: "회의록 에이전트", description: "회의 내용과 후속 액션 정리" },
  { id: "agent-review", kind: "mention", label: "코드 리뷰 에이전트", description: "변경점과 위험 검토" },
];

const models = ["GPT-5.6", "GPT-5.5", "Claude Opus", "Claude Sonnet"] as const;
const modelOptions = models.map((label) => ({
  id: label.toLocaleLowerCase().replaceAll(" ", "-"),
  label,
}));

export function ComposerDemoRoute() {
  const [draft] = useState<JSONDocument>(() => createJSONDocument(createComposerDraft(models[0])));
  const [editor] = useState(() => createRichTextEditor({ document: draft, pointer: "/instruction", schema: composerSchema }));
  useSyncExternalStore(editor.subscribe, () => editor.snapshot.revision, () => editor.snapshot.revision);
  const instruction = draft.at("/instruction");
  if (!instruction.ok) throw new Error("Composer instruction is missing.");
  const instructionValue = instruction.value as unknown as RichTextDocument;
  const [submitted, setSubmitted] = useState<ComposerDraft | null>(null);
  const [commandActiveId, setCommandActiveId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const composerEditorRef = useRef<HTMLElement>(null);
  const trigger = activeComposerTrigger(instructionValue, editor);
  const visibleSuggestions = suggestions.filter((item) => item.kind === trigger?.kind && item.label.toLowerCase().includes(trigger.query));
  const draftValue = draft.value as ComposerDraft<(typeof models)[number]>;
  const attachments = draftValue.attachments;
  const model = draftValue.model;
  const activeSuggestion = visibleSuggestions.find((item) => item.id === commandActiveId) ?? visibleSuggestions[0] ?? null;
  const commandListbox = useListbox({
    id: "composer-command-listbox",
    label: trigger?.kind === "skill" ? "스킬 선택" : "에이전트 선택",
    items: visibleSuggestions.map((item) => ({ ...item, textValue: item.label })),
    activeId: activeSuggestion?.id ?? null,
    wrap: true,
    onActiveChange: setCommandActiveId,
    onAction: (id) => {
      const suggestion = visibleSuggestions.find((item) => item.id === id);
      if (trigger && suggestion) insertComposerSuggestion(editor, trigger, suggestion);
    },
  });
  const { onKeyDown: handleCommandKeyDown, ...commandReferenceProps } = commandListbox.referenceProps;
  const hasContent = composerDocumentText(instructionValue).trim().length > 0 || attachments.length > 0;

  const onAction = useCallback(() => undefined, []);

  function submit() {
    if (!hasContent) return;
    setSubmitted(draft.value as ComposerDraft<(typeof models)[number]>);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      return;
    }
    if (trigger && visibleSuggestions.length > 0) {
      handleCommandKeyDown(event);
      if (event.defaultPrevented) {
        event.stopPropagation();
        return;
      }
    }
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    submit();
  }

  function handleHistoryKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    if (event.shiftKey) editor.redo();
    else editor.undo();
  }

  function attachFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    addFiles(files);
    event.currentTarget.value = "";
  }

  function addFiles(files: ReadonlyArray<File>) {
    if (files.length === 0) return;
    const next = composerAttachments(files);
    editor.apply(next.map((value, index) => ({ op: "add" as const, path: `/attachments/${attachments.length + index}`, value })), { origin: "composer.attachments.add" });
    composerEditorRef.current?.focus();
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const files = Array.from(event.clipboardData.files);
    if (files.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    addFiles(files);
  }

  function removeAttachment(index: number) {
    editor.apply([{ op: "remove", path: `/attachments/${index}` }], { origin: "composer.attachments.remove" });
  }

  function selectModel(candidate: (typeof models)[number]) {
    editor.apply([{ op: "replace", path: "/model", value: candidate }], { origin: "composer.model.select" });
  }

  function chooseTrigger(value: "/" | "@") {
    composerEditorRef.current?.focus();
    insertComposerText(editor, value);
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

        <FileDropRegion
          className={`home-composer-single${hasContent ? " home-composer-single-filled" : ""}`}
          data-testid="agent-chat-composer"
          onFiles={addFiles}
          overlay={<div className="composer-dropzone-overlay"><div className="composer-dropzone-card"><strong>여기에 파일을 놓아주세요</strong><span>이미지와 문서를 Composer context에 첨부합니다.</span></div></div>}
          onPasteCapture={handlePaste}
          onKeyDownCapture={handleHistoryKeyDown}
        >
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
            <Menu
              label="추가"
              trigger="＋"
              items={[
                { id: "file", label: "파일 업로드", content: <><span>▤</span><span><strong>파일 업로드</strong><small>이미지와 문서를 첨부해요</small></span></> },
                { id: "skill", label: "스킬", content: <><span>/</span><span><strong>스킬</strong><small>반복 작업을 빠르게 실행해요</small></span></> },
                { id: "agent", label: "에이전트", content: <><span>@</span><span><strong>에이전트</strong><small>전문 에이전트와 함께 작업해요</small></span></> },
              ]}
              restoreFocusOnAction={false}
              onAction={(id) => { if (id === "file") fileInput.current?.click(); else chooseTrigger(id === "skill" ? "/" : "@"); }}
              classNames={{ root: "composer-menu-root", trigger: "composer-icon-button", popup: "composer-layer composer-add-layer" }}
            />
            <div className="composer-editor-wrap">
              {!hasComposerRichText(instructionValue) ? <span className="composer-placeholder-box">작업을 입력하세요</span> : null}
              <RichTextEditorSurface
                as="div"
                editor={editor}
                className="composer-input-box"
                aria-label="Agent Chat Composer"
                data-testid="composer-editor"
                elementRef={composerEditorRef}
                {...(trigger && visibleSuggestions.length > 0 ? commandReferenceProps : { "aria-expanded": false })}
                onAction={onAction}
                onKeyDownCapture={handleKeyDown}
                renderExtension={renderAtom}
                spellCheck={false}
              />
            </div>
            <Select
              id="composer-model"
              label="모델 선택"
              value={model.toLocaleLowerCase().replaceAll(" ", "-")}
              options={modelOptions}
              onValueChange={(id) => {
                const candidate = modelOptions.find((option) => option.id === id)?.label;
                if (candidate) selectModel(candidate);
              }}
              renderValue={(option) => <>{option.label}⌄</>}
              renderOption={(option) => <><strong>{option.label}</strong><small>{option.id.startsWith("gpt") ? "OpenAI GPT 계열" : "Anthropic Claude 계열"}</small></>}
              classNames={{ root: "composer-select-root", trigger: "composer-model-pill", listbox: "composer-layer composer-model-layer", focusedOption: "selected" }}
            />
            <button className="composer-icon-button" type="button" aria-label="음성 입력">♩</button>
            <button className={`composer-send-button${hasContent ? " is-active" : ""}`} type="button" aria-label="전송 (Enter)" disabled={!hasContent} onClick={submit}>↑</button>
          </div>

          {trigger && visibleSuggestions.length > 0 ? (
            <div {...commandListbox.listboxProps} className="composer-layer composer-command-layer">
              {visibleSuggestions.map((item) => (
                <button key={item.id} className={item.id === activeSuggestion?.id ? "selected" : ""} {...commandListbox.optionProps({ ...item, textValue: item.label })} onMouseDown={(event) => event.preventDefault()}>
                  <span className={`composer-command-icon ${item.kind}`}>{item.kind === "skill" ? "/" : "@"}</span>
                  <span><strong>{item.label}</strong><small>{item.description}</small></span>
                  <em>{item.kind === "skill" ? "Skill" : "Agent"}</em>
                </button>
              ))}
            </div>
          ) : null}
          <input ref={fileInput} className="composer-file-input" type="file" multiple aria-label="파일 첨부" onChange={attachFiles} />
        </FileDropRegion>

        <div className="composer-action-chips" aria-label="추천 작업">
          <button type="button" onClick={() => insertComposerText(editor, "경쟁사 최신 동향을 조사해줘")}>⌕ 경쟁사 최신 동향 조사</button>
          <button type="button" onClick={() => insertComposerText(editor, "전략 기획서 초안을 작성해줘")}>⌁ 전략 기획서 초안 작성</button>
          <button type="button" onClick={() => insertComposerText(editor, "뉴스 브리핑을 매일 예약해줘")}>◷ 뉴스 브리핑 예약 설정</button>
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

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
