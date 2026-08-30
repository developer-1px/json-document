import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { Command, Field } from "@interactive-os/json-document-ui-primitives-react";
import "./llm-agent-artifact.css";

type Message = { readonly id: number; readonly role: "user" | "assistant"; readonly text: string };

export function LlmAgentArtifactRoute() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ReadonlyArray<Message>>([]);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || pending) return;
    const userId = Date.now();
    const assistantId = userId + 1;
    setInput("");
    setPending(true);
    setMessages((current) => [...current, { id: userId, role: "user", text: prompt }, { id: assistantId, role: "assistant", text: "" }]);
    try {
      await streamCodex(prompt, (delta) => setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, text: message.text + delta } : message)));
    } catch (error) {
      const text = error instanceof Error ? error.message : "Codex 요청에 실패했습니다.";
      setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, text } : message));
    } finally {
      setPending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <div className="llm-agent-app">
      <header className="llm-agent-app-header"><strong>LLM Agent</strong><span>Local Codex</span></header>
      <section className="llm-agent-chat" aria-label="대화">
        {messages.length === 0 ? <div className="llm-agent-empty"><h1>무엇을 도와드릴까요?</h1><p>로컬 Codex와 대화를 시작하세요.</p></div> : messages.map((message) => (
          <article className={`llm-agent-message ${message.role}`} key={message.id}>
            <strong>{message.role === "user" ? "나" : "Codex"}</strong>
            <p role={message.role === "assistant" ? "status" : undefined}>{message.text || "생각하고 있습니다…"}</p>
          </article>
        ))}
      </section>
      <form className="llm-agent-input" onSubmit={submit}>
        <Field multiline label="메시지" placeholder="메시지를 입력하세요" value={input} onValueChange={setInput} onKeyDown={handleKeyDown} rows={1} />
        <Command kind="primary" label="전송" disabled={!input.trim() || pending} type="submit"><ArrowUp aria-hidden="true" size={18} /></Command>
      </form>
    </div>
  );
}

async function streamCodex(prompt: string, write: (delta: string) => void) {
  const response = await fetch("/__dev/codex", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
  if (!response.ok || !response.body) throw new Error(await response.text());
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    write(value);
  }
}
