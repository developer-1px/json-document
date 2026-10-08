import { createAgentChatSession, type AgentChatSession } from "./agent-chat-session";
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

const config: ComposerHostConfig = {
  profile: COMPOSER_HOST_PROFILE_V1,
  models: [{ id: "local", value: "local", label: "Local", description: "문서 작성" }],
  suggestions: [], attachments: { acceptedMediaTypes: [], maxFiles: null, maxBytesPerFile: null },
  interaction: { submit: "enter", newline: "shift-enter" },
};

export function EditorAgentChat({ tools, id, label, logLabel, inputLabel, placeholder, onBusyChange }: {
  tools: ReadonlyArray<LlmAgentTool>; id: string; label: string; logLabel: string; inputLabel: string; placeholder: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [stored] = useState(() => createAgentChatSession(id));
  const chat = useSyncExternalStore(stored.source.subscribe, () => stored.source.snapshot.value) as AgentChatSession;
  const saveState = useSyncExternalStore(stored.subscribe, () => stored.state);
  const { messages } = chat;
  const [expanded, setExpanded] = useState(messages.length > 0);
  useEffect(() => stored.connect(), [stored]);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const composer = useComposer({
    id, config,
    ports: { createId: createRichTextNodeId, submit: async draft => {
      const turn = { prompt: composerText(draft.instruction), reply: "", state: "running" as const };
      const index = (stored.source.snapshot.value as AgentChatSession).messages.length;
      const update = (changes: Partial<AgentChatSession["messages"][number]>) => stored.source.update(current => ({ ...current, messages: current.messages.map((message, i) => i === index ? { ...message, ...changes } : message) }));
      setExpanded(true);
      stored.source.update(current => ({ ...current, messages: [...current.messages, turn] }));
      request.current = new AbortController();
      onBusyChange?.(true);
      try {
        await streamLlmAgentTurn({
          prompt: turn.prompt, mode: "chat", tools, sessionId: (stored.source.snapshot.value as AgentChatSession).sessionId, signal: request.current.signal,
          onSession: sessionId => { stored.source.update(current => ({ ...current, sessionId })); },
          write: delta => { turn.reply += delta; update({ reply: turn.reply }); },
        });
        update({ state: "complete" });
      } catch {
        request.current?.abort();
        update({ state: "error" });
      } finally { onBusyChange?.(false); }
    } },
    labels: { mentionSuggestions: "멘션", skillSuggestions: "스킬" }, shouldClearAfterSubmit: true, submitClearTiming: "start",
  });
  return <aside aria-label={label} className={`${floatingSurface.panel} fixed bottom-4 right-4 z-20 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 p-3`}>
    {messages.length > 0 && <Command onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="self-end text-sm text-foreground-secondary focus-visible:outline">{expanded ? "대화 접기" : "대화 펼치기"}</Command>}
    {expanded && <div role="log" aria-label={logLabel} className="flex max-h-[50dvh] flex-col gap-3 overflow-y-auto">
      {messages.map((turn, index) => <Fragment key={index}>
        <ChatBubble direction="outgoing" label="나">{turn.prompt}</ChatBubble>
        {turn.reply && <ChatBubble direction="incoming" label="AI">{turn.reply}</ChatBubble>}
        {(turn.state === "error" || turn.state === "interrupted") && <p role="status" className="text-xs text-foreground-secondary">{turn.state === "error" ? "요청을 완료하지 못했습니다." : "이전 작업이 중단됐습니다."} 반영된 편집은 유지됩니다.</p>}
      </Fragment>)}
    </div>}
    {(saveState === "load-error" || saveState === "save-error") && <p role="alert" className="text-xs text-foreground-secondary">대화를 보관하지 못했습니다. 기존 저장 데이터는 유지됩니다.</p>}
    {composer.isSubmitting && <ChatActivity label="작업 중" />}
    <ChatComposer composer={composer} label={inputLabel} placeholder={placeholder} submitLabel="보내기" submitErrorLabel="요청을 완료하지 못했습니다. 대화의 요청을 확인해 다시 입력해 주세요." />
  </aside>;
}
