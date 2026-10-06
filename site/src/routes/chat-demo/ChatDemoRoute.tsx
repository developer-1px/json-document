import { useState } from "react";
import { COMPOSER_HOST_PROFILE_V1, type ComposerDraft, type ComposerHostConfig } from "@interactive-os/json-document-composer";
import { ChatComposer, useComposer } from "@interactive-os/json-document-composer-react";
import { createRichTextNodeId } from "@interactive-os/json-document-rich-text";
import { RichTextRenderer } from "@interactive-os/json-document-rich-text-react";
import { ChatBubble } from "@interactive-os/json-document-ui-primitives-react";
import "@interactive-os/json-document-ui-primitives-react/chat-bubble.css";
import "@interactive-os/json-document-composer-react/chat-composer.css";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { PageHeader } from "../../shared/ui/primitives";

const config: ComposerHostConfig = {
  profile: COMPOSER_HOST_PROFILE_V1,
  models: [{ id: "local", value: "local", label: "Local", description: "로컬 입력 예제" }],
  suggestions: [],
  attachments: { acceptedMediaTypes: [], maxFiles: null, maxBytesPerFile: null },
  interaction: { submit: "enter", newline: "shift-enter" },
};

export function ChatDemoRoute() {
  const [messages, setMessages] = useState<ReadonlyArray<ComposerDraft>>([]);
  const composer = useComposer({
    id: "chat-usage",
    config,
    ports: { createId: createRichTextNodeId, submit: async (draft) => { setMessages((current) => [...current, draft]); } },
    labels: { mentionSuggestions: "멘션", skillSuggestions: "스킬" },
    shouldClearAfterSubmit: true,
  });
  return (
    <DemoPage documentation={<PageHeader label="UI Primitives" title="Chat">메시지를 입력해 보세요. Enter로 보내고 Shift+Enter로 줄을 바꿉니다. 이 예제는 현재 화면에서만 동작합니다.</PageHeader>}>
      <div className="mx-auto flex min-h-96 w-full max-w-2xl flex-col gap-8 py-6">
        <div role="log" aria-label="대화" className="flex flex-col gap-3">
          <ChatBubble direction="incoming" label="상대방">생각을 짧게 남겨도 좋아요.</ChatBubble>
          <ChatBubble direction="outgoing" label="나">여기서부터 시작해 볼게요.</ChatBubble>
          <ChatBubble direction="incoming" label="상대방">좋아요. 한 줄씩 이어가요.</ChatBubble>
          {messages.map((message, index) => <ChatBubble key={`${message.id}-${index}`} direction="outgoing" label="나"><RichTextRenderer document={message.instruction} /></ChatBubble>)}
        </div>
        <ChatComposer className="mt-auto" composer={composer} label="메시지" placeholder="메시지 입력" submitLabel="보내기" submitErrorLabel="보내지 못했습니다. 다시 시도해 주세요." />
      </div>
    </DemoPage>
  );
}
