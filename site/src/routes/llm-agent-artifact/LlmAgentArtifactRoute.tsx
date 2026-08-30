import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { EventType, type AGUIEvent } from "@ag-ui/core";
import { ArrowUp, Plus } from "lucide-react";
import { Command, Field } from "@interactive-os/json-document-ui-primitives-react";
import { listLlmAgentSessions, readLlmAgentSession, streamLlmAgentTurn, type LlmAgentMessage, type LlmAgentSession } from "./llm-agent-api";
import { A2uiSurface, createA2uiStreamingDocumentEngine, createAgUiA2uiAdapter, type A2uiStreamingDocument, type AgUiA2uiAdapter } from "../../app/a2ui-streaming-document";
import { MarkdownContent } from "../../shared/ui/markdown-content";
import "./llm-agent-artifact.css";

const LAST_SESSION_KEY = "llm-agent-last-session";
const CHAT_SURFACE_ID = "chat";

export function LlmAgentArtifactRoute() {
  const [input, setInput] = useState("");
  const [engine] = useState(createA2uiStreamingDocumentEngine);
  const adapterRef = useRef<AgUiA2uiAdapter>(createAgUiA2uiAdapter(CHAT_SURFACE_ID));
  const [document, setDocument] = useState(() => engine.document.value as A2uiStreamingDocument);
  const [pending, setPending] = useState(false);
  const [sessions, setSessions] = useState<ReadonlyArray<LlmAgentSession>>([]);
  const [sessionId, setSessionId] = useState(() => new URLSearchParams(window.location.search).get("session") ?? window.localStorage.getItem(LAST_SESSION_KEY));

  useEffect(() => {
    const subscription = engine.document$.subscribe(setDocument);
    if (sessionId && !new URLSearchParams(window.location.search).has("session")) setSessionUrl(sessionId);
    void listLlmAgentSessions().then(setSessions);
    if (sessionId) void readLlmAgentSession(sessionId).then(loadHistory).catch(() => loadHistory([]));
    return () => subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || pending) return;
    const userId = crypto.randomUUID();
    setInput("");
    setPending(true);
    pushAgUi({ type: EventType.TEXT_MESSAGE_START, messageId: userId, role: "user" });
    pushAgUi({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: userId, delta: prompt });
    pushAgUi({ type: EventType.TEXT_MESSAGE_END, messageId: userId });
    try {
      await streamLlmAgentTurn({ prompt, sessionId, onSession: (activeSessionId) => {
        if (activeSessionId === sessionId) return;
        setSessionId(activeSessionId);
        rememberSession(activeSessionId);
      }, write: () => {}, onEvent: pushAgUi });
      setSessions(await listLlmAgentSessions());
    } catch (error) {
      const text = error instanceof Error ? error.message : "Codex 요청에 실패했습니다.";
      const errorId = crypto.randomUUID();
      pushAgUi({ type: EventType.TEXT_MESSAGE_START, messageId: errorId, role: "assistant" });
      pushAgUi({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: errorId, delta: text });
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
    loadHistory([]);
    if (id) {
      rememberSession(id);
      void readLlmAgentSession(id).then(loadHistory).catch(() => loadHistory([]));
    }
    else {
      window.localStorage.removeItem(LAST_SESSION_KEY);
      setSessionUrl(null);
    }
  }

  function pushAgUi(event: AGUIEvent) {
    for (const message of adapterRef.current.push(event)) engine.write(`${JSON.stringify(message)}\n`);
  }

  function loadHistory(history: ReadonlyArray<LlmAgentMessage>) {
    if (engine.document.at(`/surfaces/${CHAT_SURFACE_ID}`).ok) engine.dispatch({ version: "v0.9", deleteSurface: { surfaceId: CHAT_SURFACE_ID } });
    adapterRef.current = createAgUiA2uiAdapter(CHAT_SURFACE_ID);
    for (const message of history) {
      pushAgUi({ type: EventType.TEXT_MESSAGE_START, messageId: message.id, role: message.role });
      pushAgUi({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: message.id, delta: message.text });
      pushAgUi({ type: EventType.TEXT_MESSAGE_END, messageId: message.id });
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
        {!document.surfaces[CHAT_SURFACE_ID] ? <div className="llm-agent-empty"><h1>무엇을 도와드릴까요?</h1><p>로컬 Codex와 대화를 시작하세요.</p></div> : <A2uiSurface document={document} markdown={MarkdownContent} surfaceId={CHAT_SURFACE_ID} />}
      </section>
      <form className="llm-agent-input" onSubmit={submit}>
        <Field multiline label="메시지" placeholder="메시지를 입력하세요" value={input} onValueChange={setInput} onKeyDown={handleKeyDown} rows={1} />
        <Command kind="primary" label="전송" disabled={!input.trim() || pending} type="submit"><ArrowUp aria-hidden="true" size={18} /></Command>
      </form>
      </div>
    </div>
  );
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
