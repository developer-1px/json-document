import { Fragment, useEffect, useRef, useState } from "react";
import { COMPOSER_HOST_PROFILE_V1, composerText, type ComposerDraft, type ComposerHostConfig } from "@interactive-os/json-document-composer";
import { ChatComposer, useComposer } from "@interactive-os/json-document-composer-react";
import { createRichTextNodeId } from "@interactive-os/json-document-rich-text";
import { RichTextRenderer } from "@interactive-os/json-document-rich-text-react";
import { ChatActivity, ChatBubble } from "@interactive-os/json-document-ui-primitives-react";
import "@interactive-os/json-document-ui-primitives-react/chat-bubble.css";
import "@interactive-os/json-document-composer-react/chat-composer.css";
import { prepareLlmAgentChat, streamLlmAgentTurn } from "../../app/llm-agent-api";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { PageHeader } from "../../shared/ui/primitives";

const localAgent = import.meta.env.DEV && new URLSearchParams(location.search).get("agent") === "local";

const config: ComposerHostConfig = {
  profile: COMPOSER_HOST_PROFILE_V1,
  models: [{ id: "local", value: "local", label: "Local", description: "로컬 입력 예제" }],
  suggestions: [],
  attachments: { acceptedMediaTypes: [], maxFiles: null, maxBytesPerFile: null },
  interaction: { submit: "enter", newline: "shift-enter" },
};

export function ChatDemoRoute() {
  const [messages, setMessages] = useState<ReadonlyArray<{ draft: ComposerDraft; reply: string }>>([]);
  const session = useRef<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const preparation = useRef<Promise<string | null> | null>(null);
  const preparationRequest = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); preparationRequest.current?.abort(); }, []);
  function prepare() {
    if (!localAgent || preparation.current) return;
    preparationRequest.current = new AbortController();
    preparation.current = prepareLlmAgentChat(preparationRequest.current.signal).catch(() => null);
  }
  const composer = useComposer({
    id: "chat-usage",
    config,
    ports: { createId: createRichTextNodeId, submit: async (draft) => {
      const turn = { draft, reply: "" };
      setMessages(current => [...current, turn]);
      if (!localAgent) return;
      request.current = new AbortController();
      try {
        await streamLlmAgentTurn({
          prompt: composerText(draft.instruction), mode: "chat", sessionId: session.current ?? await preparation.current,
          signal: request.current.signal,
          onSession: id => { session.current = id; },
          write: delta => { turn.reply += delta; setMessages(current => [...current]); },
        });
      } catch (error) {
        setMessages(current => current.filter(message => message !== turn));
        throw error;
      }
    } },
    labels: { mentionSuggestions: "멘션", skillSuggestions: "스킬" },
    shouldClearAfterSubmit: true, submitClearTiming: "start",
  });
  return (
    <DemoPage documentation={<PageHeader label="UI Primitives" title="Chat">메시지를 입력해 보세요. Enter로 보내고 Shift+Enter로 줄을 바꿉니다. {localAgent ? "로컬 Codex · Luna · 추론 없음 · Fast로 응답합니다." : "이 예제는 현재 화면에서만 동작합니다."}</PageHeader>}>
      <div onFocusCapture={prepare} className="mx-auto flex min-h-96 w-full max-w-2xl flex-col gap-8 py-6">
        <div role="log" aria-label="대화" className="flex flex-col gap-3">
          {!localAgent && <>
          <ChatBubble direction="incoming" label="상대방">생각을 짧게 남겨도 좋아요.</ChatBubble>
          <ChatBubble direction="outgoing" label="나">여기서부터 시작해 볼게요.</ChatBubble>
          <ChatBubble direction="incoming" label="상대방">좋아요. 한 줄씩 이어가요.</ChatBubble>
          </>}
          {messages.map(({ draft, reply }, index) => <Fragment key={`${draft.id}-${index}`}>
            <ChatBubble direction="outgoing" label="나"><RichTextRenderer document={draft.instruction} /></ChatBubble>
            {localAgent && reply && <ChatBubble direction="incoming" label="AI">{reply}</ChatBubble>}
          </Fragment>)}
        </div>
        {composer.isSubmitting && <ChatActivity label="작업 중" />}
        <ChatComposer className="mt-auto" composer={composer} label="메시지" placeholder="메시지 입력" submitLabel="보내기" submitErrorLabel="보내지 못했습니다. 다시 시도해 주세요." />
      </div>
    </DemoPage>
  );
}
