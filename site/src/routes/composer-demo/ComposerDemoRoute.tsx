import { useCallback, useRef, useState, useSyncExternalStore, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { createJSONDocument, type JSONDocument, type JSONValue } from "@interactive-os/json-document";
import { ActionButton, FileDropRegion, IconButton, Menu, Select, SelectableItem, formatFileSize } from "@interactive-os/json-document-ui-primitives-react";
import {
  createRichTextNodeId,
  createRichTextEditor,
  type RichTextDocument,
  type RichTextNode,
} from "@interactive-os/json-document-rich-text";
import {
  COMPOSER_HOST_PROFILE_V1,
  addComposerAttachments,
  composerInteractionFromKeyStroke,
  composerHostConfigSchema,
  composerSchema,
  createComposerAttachments,
  createComposerDraft,
  findComposerTrigger,
  hasComposerContent,
  insertComposerText,
  insertComposerReference,
  removeComposerAttachment,
  selectComposerModel,
  type ComposerDraft,
  type ComposerHostConfig,
  type ComposerHostPorts,
  type ComposerReference,
} from "@interactive-os/json-document-composer";
import { ComposerReferenceAtom } from "@interactive-os/json-document-composer-react";
import { findRichTextSuggestionTrigger } from "@interactive-os/json-document-rich-text-suggestion";
import { useRichTextSuggestion } from "@interactive-os/json-document-rich-text-suggestion-react";
import { RichTextMentionSuggestions, useRichTextMentionSuggestions } from "@interactive-os/json-document-rich-text-mention-react";
import { fileCandidatesFromWebClipboard, fileCandidatesFromWebFiles } from "@interactive-os/json-document-web";
import { RichTextEditorSurface } from "@interactive-os/json-document-rich-text-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { PageHeader } from "../../shared/ui/primitives";
import "./composer-demo.css";

type ComposerSuggestion = ComposerReference & Readonly<Record<string, JSONValue>> & { readonly description: string; readonly iconText: string };

const suggestions: ReadonlyArray<ComposerSuggestion> = [
  { id: "skill-summary", kind: "skill", label: "요약", description: "대화와 문서를 핵심만 정리", iconText: "/" },
  { id: "skill-translate", kind: "skill", label: "번역", description: "선택한 언어로 자연스럽게 번역", iconText: "/" },
  { id: "skill-task", kind: "skill", label: "작업 만들기", description: "다음 액션을 일정과 태스크로 변환", iconText: "/" },
  { id: "agent-research", kind: "mention", label: "리서치 에이전트", description: "자료 조사와 출처 기반 정리", iconText: "R" },
  { id: "agent-meeting", kind: "mention", label: "회의록 에이전트", description: "회의 내용과 후속 액션 정리", iconText: "M" },
  { id: "agent-review", kind: "mention", label: "코드 리뷰 에이전트", description: "변경점과 위험 검토", iconText: "C" },
];

const models = ["GPT-5.6", "GPT-5.5", "Claude Opus", "Claude Sonnet"] as const;
type ComposerModel = (typeof models)[number];

const modelOptions = models.map((label) => ({
  id: label.toLocaleLowerCase().replaceAll(" ", "-"),
  label,
  value: label,
}));

const hostConfig = {
  profile: COMPOSER_HOST_PROFILE_V1,
  models: modelOptions,
  suggestions,
  attachments: { acceptedMediaTypes: ["*/*"], maxFiles: null, maxBytesPerFile: null },
  interaction: { submit: "enter", newline: "shift-enter" },
} satisfies ComposerHostConfig<ComposerModel>;

if (hostConfig.profile !== composerHostConfigSchema.$id) throw new TypeError("Composer Host config profile does not match its schema.");

export function ComposerDemoRoute() {
  const [draft] = useState<JSONDocument>(() => createJSONDocument(createComposerDraft({ id: "composer-draft", instructionId: "composer-instruction", paragraphId: "composer-paragraph", model: models[0] })));
  const [editor] = useState(() => createRichTextEditor({ document: draft, pointer: "/instruction", schema: composerSchema }));
  useSyncExternalStore(editor.subscribe, () => editor.snapshot.revision, () => editor.snapshot.revision);
  const instruction = draft.at("/instruction");
  if (!instruction.ok) throw new Error("Composer instruction is missing.");
  const instructionValue = instruction.value as unknown as RichTextDocument;
  const [submitted, setSubmitted] = useState<ComposerDraft | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const composerEditorRef = useRef<HTMLElement>(null);
  const trigger = findComposerTrigger(instructionValue, editor.snapshot.selection);
  const suggestionTrigger = findRichTextSuggestionTrigger(instructionValue, editor.snapshot.selection, ["/", "@"]) ;
  const mentionMenu = useRichTextMentionSuggestions({
    id: "composer-mention-listbox",
    label: "에이전트 선택",
    editor,
    trigger: suggestionTrigger,
    suggestions: hostConfig.suggestions.filter((item) => item.kind === "mention"),
    createId: createRichTextNodeId,
  });
  const skillMenu = useRichTextSuggestion({
    id: "composer-skill-listbox",
    label: "스킬 선택",
    trigger: suggestionTrigger?.trigger === "/" ? suggestionTrigger : null,
    candidates: hostConfig.suggestions.filter((item) => item.kind === "skill"),
    onAction: (suggestion, activeTrigger) => insertComposerReference(editor, { kind: "skill", query: activeTrigger.query, range: activeTrigger.range }, suggestion, { createId: createRichTextNodeId }),
  });
  const commandMenu = trigger?.kind === "mention" ? mentionMenu : skillMenu;
  const visibleSuggestions = commandMenu.items;
  const draftValue = draft.value as ComposerDraft<(typeof models)[number]>;
  const attachments = draftValue.attachments;
  const model = draftValue.model;
  const { onKeyDown: handleCommandKeyDown, ...commandReferenceProps } = commandMenu.referenceProps;
  const hasContent = hasComposerContent(draftValue);
  const hostPorts: ComposerHostPorts<ComposerModel> = {
    createId: createRichTextNodeId,
    submit: async (value) => { setSubmitted(value); },
  };

  const onAction = useCallback(() => undefined, []);
  const renderComposerReference = useCallback((node: RichTextNode) => <ComposerReferenceAtom node={node} editor={editor} className="composer-atom" />, [editor]);

  function submit() {
    if (!hasContent) return;
    void hostPorts.submit(draft.value as ComposerDraft<ComposerModel>);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const interaction = composerInteractionFromKeyStroke({ key: event.key, shiftKey: event.shiftKey, commandKey: event.metaKey || event.ctrlKey }, hostConfig.interaction);
    if (trigger && visibleSuggestions.length > 0) {
      handleCommandKeyDown(event);
      if (event.defaultPrevented) {
        event.stopPropagation();
        return;
      }
    }
    if (interaction === "dismiss") return;
    if (interaction !== "submit") return;
    event.preventDefault();
    event.stopPropagation();
    submit();
  }

  function handleHistoryKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const interaction = composerInteractionFromKeyStroke({ key: event.key, shiftKey: event.shiftKey, commandKey: event.metaKey || event.ctrlKey }, hostConfig.interaction);
    if (interaction !== "history.undo" && interaction !== "history.redo") return;
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    if (interaction === "history.redo") editor.redo();
    else editor.undo();
  }

  function attachFiles(event: ChangeEvent<HTMLInputElement>) {
    addFiles(fileCandidatesFromWebFiles(event.currentTarget.files ?? []));
    event.currentTarget.value = "";
  }

  function addFiles(candidates: ReturnType<typeof fileCandidatesFromWebFiles>) {
    if (candidates.length === 0) return;
    const created = createComposerAttachments(candidates, { createId: hostPorts.createId, policy: hostConfig.attachments, currentCount: attachments.length });
    if (!created.ok) return;
    addComposerAttachments(editor, draftValue, created.attachments);
    composerEditorRef.current?.focus();
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const candidates = fileCandidatesFromWebClipboard(event);
    if (candidates.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    addFiles(candidates);
  }

  function removeAttachment(attachmentId: string) {
    removeComposerAttachment(editor, draftValue, attachmentId);
  }

  function selectModel(candidate: ComposerModel) {
    selectComposerModel(editor, candidate);
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
          onFiles={(files) => addFiles(fileCandidatesFromWebFiles(files))}
          overlay={<div className="composer-dropzone-overlay"><div className="composer-dropzone-card"><strong>여기에 파일을 놓아주세요</strong><span>이미지와 문서를 Composer context에 첨부합니다.</span></div></div>}
          onPasteCapture={handlePaste}
          onKeyDownCapture={handleHistoryKeyDown}
        >
          {attachments.length > 0 ? (
            <div className="composer-attachments" aria-label="첨부 파일">
              {attachments.map((file) => (
                <div className="composer-file" key={file.id}>
                  <span className="composer-file-ic" aria-hidden="true">{file.kind === "image" ? "▧" : "▤"}</span>
                  <span className="composer-file-info">
                    <span className="composer-file-name">{file.name}</span>
                    <span className="composer-file-size">{formatFileSize(file.size)}</span>
                  </span>
                  <IconButton className="composer-file-remove" label={`${file.name} 제거`} onClick={() => removeAttachment(file.id)}>×</IconButton>
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
                placeholder="작업을 입력하세요"
                renderExtension={renderComposerReference}
                spellCheck={false}
              />
            </div>
            <Select
              id="composer-model"
              label="모델 선택"
              value={model.toLocaleLowerCase().replaceAll(" ", "-")}
              options={hostConfig.models}
              onValueChange={(id) => {
                const candidate = hostConfig.models.find((option) => option.id === id)?.value;
                if (candidate) selectModel(candidate);
              }}
              renderValue={(option) => <>{option.label}⌄</>}
              renderOption={(option) => <><strong>{option.label}</strong><small>{option.id.startsWith("gpt") ? "OpenAI GPT 계열" : "Anthropic Claude 계열"}</small></>}
              classNames={{ root: "composer-select-root", trigger: "composer-model-pill", listbox: "composer-layer composer-model-layer", focusedOption: "selected" }}
            />
            <IconButton className="composer-icon-button" label="음성 입력">♩</IconButton>
            <ActionButton kind="primary" aria-label="전송 (Enter)" className={`composer-send-button${hasContent ? " is-active" : ""}`} disabled={!hasContent} onClick={submit}>전송</ActionButton>
          </div>

          {trigger?.kind === "mention" ? (
            <RichTextMentionSuggestions binding={mentionMenu} groupLabel="에이전트" className="composer-layer composer-command-layer" />
          ) : trigger?.kind === "skill" && visibleSuggestions.length > 0 ? (
            <div {...skillMenu.listboxProps} className="composer-layer composer-command-layer">
              {skillMenu.items.map((item) => (
                <SelectableItem as="button" selected={false} focus={item.id === skillMenu.activeItem?.id} key={item.id} className={item.id === skillMenu.activeItem?.id ? "selected" : ""} {...skillMenu.optionProps(item)} onMouseDown={(event) => event.preventDefault()}>
                  <span className="composer-command-icon skill">/</span>
                  <span><strong>{item.label}</strong><small>{item.description}</small></span>
                  <em>Skill</em>
                </SelectableItem>
              ))}
            </div>
          ) : null}
          <input ref={fileInput} className="composer-file-input" type="file" multiple aria-label="파일 첨부" onChange={attachFiles} />
        </FileDropRegion>

        <div className="composer-action-chips" aria-label="추천 작업">
          <ActionButton onClick={() => insertComposerText(editor, "경쟁사 최신 동향을 조사해줘")}>⌕ 경쟁사 최신 동향 조사</ActionButton>
          <ActionButton onClick={() => insertComposerText(editor, "전략 기획서 초안을 작성해줘")}>⌁ 전략 기획서 초안 작성</ActionButton>
          <ActionButton onClick={() => insertComposerText(editor, "뉴스 브리핑을 매일 예약해줘")}>◷ 뉴스 브리핑 예약 설정</ActionButton>
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
