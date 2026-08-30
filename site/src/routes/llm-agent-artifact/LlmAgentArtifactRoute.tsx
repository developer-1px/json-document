import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Plus } from "lucide-react";
import { Command, Field } from "@interactive-os/json-document-ui-primitives-react";
import "./llm-agent-artifact.css";

type Message = { readonly id: number; readonly role: "user" | "assistant"; readonly text: string };
type Session = { readonly id: string; readonly preview: string; readonly updatedAt: number };
const LAST_SESSION_KEY = "llm-agent-last-session";

export function LlmAgentArtifactRoute() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ReadonlyArray<Message>>([]);
  const [pending, setPending] = useState(false);
  const [sessions, setSessions] = useState<ReadonlyArray<Session>>([]);
  const [sessionId, setSessionId] = useState(() => new URLSearchParams(window.location.search).get("session") ?? window.localStorage.getItem(LAST_SESSION_KEY));

  useEffect(() => {
    if (sessionId && !new URLSearchParams(window.location.search).has("session")) setSessionUrl(sessionId);
    void loadSessions().then(setSessions);
  }, []);

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
      await streamCodex(prompt, sessionId, (activeSessionId) => {
        if (activeSessionId === sessionId) return;
        setSessionId(activeSessionId);
        rememberSession(activeSessionId);
        void loadSessions().then(setSessions);
      }, (delta) => setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, text: message.text + delta } : message)));
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

  function selectSession(id: string | null) {
    setSessionId(id);
    setMessages([]);
    if (id) rememberSession(id);
    else {
      window.localStorage.removeItem(LAST_SESSION_KEY);
      setSessionUrl(null);
    }
  }

  return (
    <div className="llm-agent-app">
      <aside className="llm-agent-sessions" aria-label="채팅 목록">
        <div className="llm-agent-sessions-header"><strong>채팅</strong><Command label="새 채팅" onClick={() => selectSession(null)}><Plus aria-hidden="true" size={16} /></Command></div>
        <nav aria-label="저장된 채팅">
          {sessions.map((session) => <Command key={session.id} className={session.id === sessionId ? "active" : undefined} onClick={() => selectSession(session.id)}>{session.preview || "새 채팅"}</Command>)}
        </nav>
      </aside>
      <div className="llm-agent-main">
      <header className="llm-agent-app-header"><strong>LLM Agent</strong><span>{sessionId ? sessionId.slice(0, 8) : "Local Codex"}</span></header>
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
    </div>
  );
}

async function streamCodex(prompt: string, sessionId: string | null, onSession: (sessionId: string) => void, write: (delta: string) => void) {
  const response = await fetch("/__dev/codex", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, sessionId }) });
  if (!response.ok || !response.body) throw new Error(await response.text());
  const activeSessionId = response.headers.get("X-Codex-Thread-Id");
  if (activeSessionId) onSession(activeSessionId);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    write(value);
  }
}

async function loadSessions(): Promise<ReadonlyArray<Session>> {
  const response = await fetch("/__dev/codex/threads");
  if (!response.ok) return [];
  return ((await response.json()) as { threads?: ReadonlyArray<Session> }).threads ?? [];
}

function rememberSession(sessionId: string) {
  window.localStorage.setItem(LAST_SESSION_KEY, sessionId);
  setSessionUrl(sessionId);
}

function setSessionUrl(sessionId: string | null) {
  const url = new URL(window.location.href);
  if (sessionId) url.searchParams.set("session", sessionId);
  else url.searchParams.delete("session");
  window.history.replaceState(null, "", url);
}
