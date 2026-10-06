import { Fragment, useEffect, useRef, useState } from "react";
import { COMPOSER_HOST_PROFILE_V1, composerText, type ComposerHostConfig } from "@interactive-os/json-document-composer";
import { ChatComposer, useComposer } from "@interactive-os/json-document-composer-react";
import { createTextEditorTools, type TextEditor } from "@interactive-os/json-document-editing";
import { createRichTextNodeId } from "@interactive-os/json-document-rich-text";
import { ChatBubble } from "@interactive-os/json-document-ui-primitives-react";
import "@interactive-os/json-document-ui-primitives-react/chat-bubble.css";
import "@interactive-os/json-document-composer-react/chat-composer.css";
import { streamLlmAgentTurn } from "../../app/llm-agent-api";

const config: ComposerHostConfig = {
  profile: COMPOSER_HOST_PROFILE_V1,
  models: [{ id: "local", value: "local", label: "Local", description: "문서 작성" }],
  suggestions: [], attachments: { acceptedMediaTypes: [], maxFiles: null, maxBytesPerFile: null },
  interaction: { submit: "enter", newline: "shift-enter" },
};

export function BearChat({ editor }: { editor: TextEditor }) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Array<{ prompt: string; reply: string }>>([]);
  const session = useRef<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const [tools] = useState(() => createTextEditorTools(editor));
  useEffect(() => () => request.current?.abort(), []);
  const composer = useComposer({
    id: "bear-chat", config,
    ports: { createId: createRichTextNodeId, submit: async draft => {
      const turn = { prompt: composerText(draft.instruction), reply: "" };
      setExpanded(true);
      setMessages(current => [...current, turn]);
      request.current = new AbortController();
      try {
        await streamLlmAgentTurn({
          prompt: turn.prompt, mode: "chat", tools, sessionId: session.current, signal: request.current.signal,
          onSession: id => { session.current = id; },
          write: delta => { turn.reply += delta; setMessages(current => [...current]); },
        });
      } catch (error) {
        request.current?.abort();
        turn.reply += "\n응답을 완료하지 못했습니다. 본문에 반영된 내용은 유지됩니다.";
        setMessages(current => [...current]);
        throw error;
      }
    } },
    labels: { mentionSuggestions: "멘션", skillSuggestions: "스킬" }, shouldClearAfterSubmit: true,
  });
  return <aside aria-label="글쓰기 도우미" className="fixed bottom-4 right-4 z-20 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 rounded-xl bg-background-canvas p-3 shadow-lg">
    {messages.length > 0 && <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="self-end text-sm text-foreground-secondary focus-visible:outline">{expanded ? "대화 접기" : "대화 펼치기"}</button>}
    {expanded && <div role="log" aria-label="Bear 대화" className="flex max-h-[50dvh] flex-col gap-3 overflow-y-auto">
      {messages.map((turn, index) => <Fragment key={index}>
        <ChatBubble direction="outgoing" label="나">{turn.prompt}</ChatBubble>
        <ChatBubble direction="incoming" label="AI">{turn.reply || "응답 중…"}</ChatBubble>
      </Fragment>)}
    </div>}
    <ChatComposer composer={composer} label="글쓰기 요청" placeholder="글을 쓰거나 다듬어 달라고 해보세요" submitLabel="보내기" submitErrorLabel="요청을 완료하지 못했습니다. 다시 시도해 주세요." />
  </aside>;
}
