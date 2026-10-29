import { MessageSquare } from "lucide-react";
import { createAgentChatSession, prepareAgentChatTurn, agentChatErrorReason, type AgentChatSession, type AgentChatMessage } from "./agent-chat-session";
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { COMPOSER_HOST_PROFILE_V1, composerText, type ComposerHostConfig } from "@interactive-os/json-document-composer";
import { ChatComposer, useComposer } from "@interactive-os/json-document-composer-react";
import type { LlmAgentTool } from "./llm-agent-api";
import { createRichTextNodeId } from "@interactive-os/json-document-rich-text";
import { floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import { ChatActivity, ChatBubble, Command } from "@interactive-os/json-document-ui-primitives-react";
import "@interactive-os/json-document-ui-primitives-react/chat-bubble.css";
import "@interactive-os/json-document-composer-react/chat-composer.css";
import { streamLlmAgentTurn } from "./llm-agent-api";
import { ui } from "../shared/ui/styles";

const config: ComposerHostConfig = {
  profile: COMPOSER_HOST_PROFILE_V1,
  models: [{ id: "local", value: "local", label: "Local", description: "문서 작성" }],
  suggestions: [], attachments: { acceptedMediaTypes: [], maxFiles: null, maxBytesPerFile: null },
  interaction: { submit: "enter", newline: "shift-enter" },
};

export interface AgentChatContext { readonly id: string; readonly label: string; readonly prompt: string }

export function EditorAgentChat({ context, onClearContext, tools, id, label, logLabel, inputLabel, placeholder, onBusyChange, onStateChange, presentation = "floating", initialExpanded, session }: {
  context?: AgentChatContext; onClearContext?: (id: string) => void;
  tools: ReadonlyArray<LlmAgentTool> | (() => ReadonlyArray<LlmAgentTool>); id: string; label: string; logLabel: string; inputLabel: string; placeholder: string;
  onBusyChange?: (busy: boolean) => void;
  onStateChange?: (state: AgentChatMessage["state"] | null) => void;
  presentation?: "floating" | "embedded";
  initialExpanded?: boolean;
  session?: ReturnType<typeof createAgentChatSession>;
}) {
  const [localStored] = useState(() => session ?? createAgentChatSession(id));
  const stored = session ?? localStored;
  const chat = useSyncExternalStore(stored.source.subscribe, () => stored.source.snapshot.value) as AgentChatSession;
  const saveState = useSyncExternalStore(stored.subscribe, () => stored.state);
  const { messages } = chat;
  const [activity, setActivity] = useState("에이전트 응답 대기 중");
  const state = messages.at(-1)?.state ?? null;
  useEffect(() => { onStateChange?.(state); }, [state, onStateChange]);
  const [expanded, setExpanded] = useState(initialExpanded ?? messages.length > 0);
  useEffect(() => stored.connect(), [stored]);
  const running = messages.some(message => message.state === "running");
  useEffect(() => {if (running) setExpanded(true);}, [running]);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const composer = useComposer({
    id, config,
    ports: { createId: createRichTextNodeId, submit: async draft => {
      if ((stored.source.snapshot.value as AgentChatSession).messages.some(message => message.state === "running")) throw new Error("진행 중인 작업이 끝난 뒤 요청해 주세요.");
      const instruction = composerText(draft.instruction);
      const prompt = context ? `${instruction}\n\n[수정 대상]\n${context.prompt}\n최신 내용을 도구로 읽은 뒤 이 대상을 수정하세요. 대상이 없으면 다른 항목을 대신 수정하지 말고 알려주세요.` : instruction;
      const turn = { prompt: instruction, reply: "", state: "running" as const };
      const currentChat = stored.source.snapshot.value as AgentChatSession;
      const activeTools = typeof tools === "function" ? tools() : tools;
      const prepared = prepareAgentChatTurn(currentChat, activeTools, prompt);
      const index = currentChat.messages.length;
      const update = (changes: Partial<AgentChatSession["messages"][number]>) => stored.source.update(current => ({ ...current, messages: current.messages.map((message, i) => i === index ? { ...message, ...changes } : message) }));
      setExpanded(true);
      if (context) onClearContext?.(context.id);
      stored.source.update(current => ({ ...current, sessionId: prepared.sessionId, toolSignature: prepared.toolSignature, messages: [...current.messages, turn] }));
      const controller = new AbortController();
      request.current = controller;
      setActivity("에이전트 응답 대기 중");
      onBusyChange?.(true);
      try {
        await streamLlmAgentTurn({
          prompt: prepared.prompt, mode: "chat", tools: activeTools, sessionId: prepared.sessionId, signal: controller.signal,
          onEvent: event => {
            if (event.type === "CUSTOM" && event.name === "client-tool") setActivity("문서 읽기·편집 중");
            else if (event.type === "TEXT_MESSAGE_CONTENT") setActivity("답변 작성 중");
          },
          onSession: sessionId => { stored.source.update(current => ({ ...current, sessionId })); },
          write: delta => { turn.reply += delta; update({ reply: turn.reply }); },
        });
        update({ state: "complete" });
      } catch (error) {
        const interrupted = controller.signal.aborted;
        controller.abort();
        update(interrupted ? { state: "interrupted" } : { state: "error", error: agentChatErrorReason(error) });
      } finally { request.current = null; onBusyChange?.(false); }
    } },
    labels: { mentionSuggestions: "멘션", skillSuggestions: "스킬" }, shouldClearAfterSubmit: true, submitClearTiming: "start",
  });
  useEffect(() => {
    if (!context) return;
    const frame = requestAnimationFrame(() => composer.editorElementRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [context?.id]);
  const Container = presentation === "embedded" ? "div" : "aside";
  return <Container data-chat-expanded={expanded} aria-label={label} className={presentation === "embedded"
    ? "flex min-h-0 flex-col gap-related text-sm"
    : `${floatingSurface.panel} fixed bottom-4 right-4 z-20 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-related p-related`}>
    {presentation === "floating" && expanded && messages.length > 0 && <Command onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="self-end text-sm text-foreground-muted focus-visible:outline">{expanded ? "대화 접기" : "대화 펼치기"}</Command>}
    {(presentation === "embedded" || expanded) && <div role="log" aria-label={logLabel} className="flex min-h-0 max-h-[50dvh] flex-col gap-related overflow-y-auto">
      {messages.map((turn, index) => <Fragment key={index}>
        <ChatBubble direction="outgoing" label="나">{turn.prompt}</ChatBubble>
        {turn.reply && <ChatBubble direction="incoming" label="AI">{turn.reply}</ChatBubble>}
        {(turn.state === "error" || turn.state === "interrupted") && <p role="status" className={ui.agentChat.note}>{turn.state === "error" ? `요청을 완료하지 못했습니다.${turn.error ? ` ${turn.error}` : ""}` : "작업이 중단됐습니다."} 반영된 편집은 유지됩니다.</p>}
      </Fragment>)}
    </div>}
    {(saveState === "load-error" || saveState === "save-error") && <p role="alert" className={ui.agentChat.note}>대화를 보관하지 못했습니다. 기존 저장 데이터는 유지됩니다.</p>}
    {running && !composer.isSubmitting && <ChatActivity label="배치 의도 확인·정리 중" />}
    {composer.isSubmitting && <div className="flex items-center justify-between gap-related"><ChatActivity label={activity} /><Command onClick={() => request.current?.abort()}>중단</Command></div>}
    {context && <div role="group" aria-label="수정 대상" className={ui.agentChat.target}>
      <span className="min-w-0 truncate">{context.label}</span>
      {onClearContext && <Command onClick={() => onClearContext(context.id)}>대상 해제</Command>}
    </div>}
    <div className="flex min-w-0 items-end gap-related" inert={running && !composer.isSubmitting}>
      {presentation === "floating" && !expanded && messages.length > 0 && <Command label="대화 펼치기" aria-expanded={false} onClick={() => setExpanded(true)} className="self-center"><MessageSquare aria-hidden="true" size={16} /></Command>}
      <ChatComposer className="min-w-0 flex-1" speechInput={{ lang: "ko-KR" }} composer={composer} label={inputLabel} placeholder={placeholder} submitLabel="보내기" submitErrorLabel="요청을 완료하지 못했습니다. 대화의 요청을 확인해 다시 입력해 주세요." />
    </div>
  </Container>;
}
