import { useCallback, useState, type ReactNode } from "react";
import type { JSONValue } from "@interactive-os/json-document";
import { ActionButton, FileDropRegion, IconButton, Menu, Select, SelectableItem, formatFileSize } from "@interactive-os/json-document-ui-primitives-react";
import { createRichTextNodeId, type RichTextNode } from "@interactive-os/json-document-rich-text";
import {
  COMPOSER_HOST_PROFILE_V1,
  composerHostConfigSchema,
  type ComposerDraft,
  type ComposerHostConfig,
  type ComposerHostModel,
  type ComposerHostPorts,
  type ComposerReference,
} from "@interactive-os/json-document-composer";
import { useComposer } from "@interactive-os/json-document-composer-react";
import { RichTextMentionSuggestions } from "@interactive-os/json-document-rich-text-mention-react";
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

const modelOptions = [
  { id: "gpt-5.6", label: "GPT-5.6", value: "GPT-5.6", description: "OpenAI GPT 계열" },
  { id: "gpt-5.5", label: "GPT-5.5", value: "GPT-5.5", description: "OpenAI GPT 계열" },
  { id: "claude-opus", label: "Claude Opus", value: "Claude Opus", description: "Anthropic Claude 계열" },
  { id: "claude-sonnet", label: "Claude Sonnet", value: "Claude Sonnet", description: "Anthropic Claude 계열" },
] as const satisfies ReadonlyArray<ComposerHostModel>;
type ComposerModel = (typeof modelOptions)[number]["value"];

const hostConfig = {
  profile: COMPOSER_HOST_PROFILE_V1,
  models: modelOptions,
  suggestions,
  attachments: { acceptedMediaTypes: ["*/*"], maxFiles: null, maxBytesPerFile: null },
  interaction: { submit: "enter", newline: "shift-enter" },
} satisfies ComposerHostConfig<ComposerModel>;

if (hostConfig.profile !== composerHostConfigSchema.$id) throw new TypeError("Composer Host config profile does not match its schema.");

export function ComposerDemoRoute() {
  const [submitted, setSubmitted] = useState<ComposerDraft | null>(null);
  const hostPorts: ComposerHostPorts<ComposerModel> = {
    createId: createRichTextNodeId,
    submit: async (value) => { setSubmitted(value); },
  };
  const composer = useComposer({ id: "composer", config: hostConfig, ports: hostPorts, labels: { mentionSuggestions: "에이전트 선택", skillSuggestions: "스킬 선택" } });

  const onAction = useCallback(() => undefined, []);
  const renderComposerReference = useCallback((node: RichTextNode) => composer.renderReference(node, { className: "composer-atom" }), [composer.renderReference]);
  const addActions: ReadonlyArray<{ readonly id: string; readonly label: string; readonly content: ReactNode; readonly run: () => void }> = [
    { id: "file", label: "파일 업로드", content: <><span>▤</span><span><strong>파일 업로드</strong><small>이미지와 문서를 첨부해요</small></span></>, run: composer.openFilePicker },
    { id: "skill", label: "스킬", content: <><span>/</span><span><strong>스킬</strong><small>반복 작업을 빠르게 실행해요</small></span></>, run: () => composer.chooseTrigger("/") },
    { id: "agent", label: "에이전트", content: <><span>@</span><span><strong>에이전트</strong><small>전문 에이전트와 함께 작업해요</small></span></>, run: () => composer.chooseTrigger("@") },
  ];

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
          className={`home-composer-single${composer.hasContent ? " home-composer-single-filled" : ""}`}
          data-testid="agent-chat-composer"
          onFiles={composer.addWebFiles}
          overlay={<div className="composer-dropzone-overlay"><div className="composer-dropzone-card"><strong>여기에 파일을 놓아주세요</strong><span>이미지와 문서를 Composer context에 첨부합니다.</span></div></div>}
          onPasteCapture={composer.handlePaste}
          onKeyDownCapture={composer.handleHistoryKeyDown}
        >
          {composer.attachments.length > 0 ? (
            <div className="composer-attachments" aria-label="첨부 파일">
              {composer.attachments.map((file) => (
                <div className="composer-file" key={file.id}>
                  <span className="composer-file-ic" aria-hidden="true">{file.kind === "image" ? "▧" : "▤"}</span>
                  <span className="composer-file-info">
                    <span className="composer-file-name">{file.name}</span>
                    <span className="composer-file-size">{formatFileSize(file.size)}</span>
                  </span>
                  <IconButton className="composer-file-remove" label={`${file.name} 제거`} onClick={() => composer.removeAttachment(file.id)}>×</IconButton>
                </div>
              ))}
            </div>
          ) : null}

          <div className="composer-input-row">
            <Menu
              label="추가"
              trigger="＋"
              items={addActions}
              restoreFocusOnAction={false}
              onAction={(id) => addActions.find((action) => action.id === id)?.run()}
              classNames={{ root: "composer-menu-root", trigger: "composer-icon-button", popup: "composer-layer composer-add-layer" }}
            />
            <div className="composer-editor-wrap">
              <RichTextEditorSurface
                as="div"
                editor={composer.editor}
                className="composer-input-box"
                aria-label="Agent Chat Composer"
                data-testid="composer-editor"
                elementRef={composer.editorElementRef}
                {...(composer.commandOpen ? composer.editorCommandProps : { "aria-expanded": false })}
                onAction={onAction}
                onKeyDownCapture={composer.handleKeyDown}
                placeholder="작업을 입력하세요"
                renderExtension={renderComposerReference}
                spellCheck={false}
              />
            </div>
            <Select
              id="composer-model"
              label="모델 선택"
              value={hostConfig.models.find((option) => option.value === composer.model)?.id ?? hostConfig.models[0]!.id}
              options={hostConfig.models}
              onValueChange={(id) => {
                const candidate = hostConfig.models.find((option) => option.id === id)?.value;
                if (candidate) composer.selectModel(candidate);
              }}
              renderValue={(option) => <>{option.label}⌄</>}
              renderOption={(option) => <><strong>{option.label}</strong><small>{hostConfig.models.find((model) => model.id === option.id)?.description}</small></>}
              classNames={{ root: "composer-select-root", trigger: "composer-model-pill", listbox: "composer-layer composer-model-layer", focusedOption: "selected" }}
            />
            <IconButton className="composer-icon-button" label="음성 입력">♩</IconButton>
            <ActionButton kind="primary" aria-label="전송 (Enter)" className={`composer-send-button${composer.hasContent ? " is-active" : ""}`} disabled={!composer.hasContent} onClick={composer.submit}>전송</ActionButton>
          </div>

          {composer.commandKind === "mention" ? (
            <RichTextMentionSuggestions binding={composer.commandMenu} groupLabel="에이전트" className="composer-layer composer-command-layer" />
          ) : composer.commandKind === "skill" && composer.commandOpen ? (
            <div {...composer.commandMenu.listboxProps} className="composer-layer composer-command-layer">
              {composer.commandMenu.items.map((item) => (
                <SelectableItem as="button" selected={false} focus={item.id === composer.commandMenu.activeItem?.id} key={item.id} className={item.id === composer.commandMenu.activeItem?.id ? "selected" : ""} {...composer.commandMenu.optionProps(item)} onMouseDown={(event) => event.preventDefault()}>
                  <span className="composer-command-icon skill">{item.iconText}</span>
                  <span><strong>{item.label}</strong><small>{item.description}</small></span>
                  <em>Skill</em>
                </SelectableItem>
              ))}
            </div>
          ) : null}
          <input ref={composer.fileInputRef} className="composer-file-input" type="file" multiple aria-label="파일 첨부" onChange={composer.handleFileInputChange} />
        </FileDropRegion>

        <div className="composer-action-chips" aria-label="추천 작업">
          <ActionButton onClick={() => composer.insertText("경쟁사 최신 동향을 조사해줘")}>⌕ 경쟁사 최신 동향 조사</ActionButton>
          <ActionButton onClick={() => composer.insertText("전략 기획서 초안을 작성해줘")}>⌁ 전략 기획서 초안 작성</ActionButton>
          <ActionButton onClick={() => composer.insertText("뉴스 브리핑을 매일 예약해줘")}>◷ 뉴스 브리핑 예약 설정</ActionButton>
        </div>
        {submitted ? <p className="composer-submit-status" role="status">canonical Composer turn을 제출했습니다.</p> : null}
      </div>

      <section className="composer-json-panel" aria-label="Canonical Composer JSON">
        <h2>Canonical Composer draft</h2>
        <JsonInspector label="Composer draft JSON" testId="composer-draft-json" value={composer.document.value} />
      </section>
    </DemoPage>
  );
}
