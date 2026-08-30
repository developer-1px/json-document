import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { EventType } from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";
import { LlmAgentArtifactRoute } from "../../src/routes/llm-agent-artifact/LlmAgentArtifactRoute";
import { A2UI_BASIC_CATALOG_ID } from "../../src/app/a2ui-streaming-document";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/artifact/llm-agent");
});

describe("LLM Agent Artifact", () => {
  test("sends a plain chat message and renders the Codex stream", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => String(input).endsWith("/sessions")
      ? Promise.resolve(Response.json({ threads: [] }))
      : Promise.resolve(agUiResponse("thread-123", "연결완료"))));
    render(<LlmAgentArtifactRoute />);

    expect(screen.getByText("Local Codex")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("메시지"), { target: { value: "안녕" } });
    fireEvent.click(screen.getByRole("button", { name: "전송" }));

    expect(screen.getByText("안녕")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("연결완료"));
    expect(new URLSearchParams(window.location.search).get("session")).toBe("thread-123");
    expect(window.localStorage.getItem("llm-agent-last-session")).toBe("thread-123");
  });

  test("selects a saved session and sends the next turn to it", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/sessions")) return Promise.resolve(Response.json({ threads: [{ id: "thread-saved", preview: "이전 채팅", updatedAt: 1 }] }));
      if (url.endsWith("/sessions/thread-saved")) return Promise.resolve(Response.json({ messages: [
        { id: "old-user", role: "user", text: "이전 질문" },
        { id: "old-assistant", role: "assistant", text: "이전 답변" },
      ] }));
      return Promise.resolve(agUiResponse("thread-saved", "계속완료"));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<LlmAgentArtifactRoute />);

    await waitFor(() => screen.getByRole("button", { name: "이전 채팅" }));
    fireEvent.click(screen.getByRole("button", { name: "이전 채팅" }));
    await waitFor(() => expect(screen.getByText("이전 답변")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("메시지"), { target: { value: "계속해줘" } });
    fireEvent.click(screen.getByRole("button", { name: "전송" }));

    await waitFor(() => expect(screen.getByText("계속완료")).toBeTruthy());
    const request = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({ threadId: "thread-saved", messages: [{ role: "user", content: "계속해줘" }] });
  });

  test("closes a failed assistant stream and exposes the error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => String(input).endsWith("/sessions")
      ? Promise.resolve(Response.json({ threads: [] }))
      : Promise.resolve(new Response("연결 실패", { status: 500 }))));
    render(<LlmAgentArtifactRoute />);

    fireEvent.change(screen.getByLabelText("메시지"), { target: { value: "실패해줘" } });
    fireEvent.click(screen.getByRole("button", { name: "전송" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("연결 실패"));
    const renderedError = screen.getAllByText("연결 실패").find((element) => element.closest("[data-markdown-renderer]"));
    expect(renderedError?.closest("[data-markdown-renderer]")?.getAttribute("data-markdown-streaming")).toBeNull();
    expect(screen.getByRole("button", { name: "전송" })).toBeTruthy();
  });

  test("aborts an active turn without adding an error message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/sessions")) return Promise.resolve(Response.json({ threads: [] }));
      return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
    }));
    render(<LlmAgentArtifactRoute />);

    fireEvent.change(screen.getByLabelText("메시지"), { target: { value: "긴 작업" } });
    fireEvent.click(screen.getByRole("button", { name: "전송" }));
    fireEvent.click(await screen.findByRole("button", { name: "중단" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "전송" })).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("renders streamed a2ui fence as UI without exposing its JSONL", async () => {
    const create = JSON.stringify({ version: "v0.9", createSurface: { surfaceId: "welcome", catalogId: A2UI_BASIC_CATALOG_ID } });
    const components = JSON.stringify({ version: "v0.9", updateComponents: { surfaceId: "welcome", components: [{ id: "root", component: "Card", children: ["title", "body"] }, { id: "title", component: "Text", text: "환영합니다", variant: "h2" }, { id: "body", component: "Text", text: "A2UI로 그린 화면입니다.", variant: "body" }] } });
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => String(input).endsWith("/sessions")
      ? Promise.resolve(Response.json({ threads: [] }))
      : Promise.resolve(agUiResponse("thread-a2ui", [`준비했습니다.\n\``, `\`\`a2ui\n${create}\n${components.slice(0, 50)}`, `${components.slice(50)}\n\`\`\``]))));
    render(<LlmAgentArtifactRoute />);

    fireEvent.change(screen.getByLabelText("메시지"), { target: { value: "환영 UI를 만들어줘" } });
    fireEvent.click(screen.getByRole("button", { name: "전송" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "환영합니다" })).toBeTruthy());
    expect(screen.getByText("A2UI로 그린 화면입니다.")).toBeTruthy();
    expect(screen.queryByText(/createSurface/)).toBeNull();
    expect(screen.queryByText(/```a2ui/)).toBeNull();
  });
});

function agUiResponse(threadId: string, content: string | ReadonlyArray<string>) {
  const encoder = new EventEncoder();
  const runId = "run-test";
  const messageId = "message-test";
  return new Response([
    { type: EventType.RUN_STARTED, threadId, runId },
    { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" },
    ...(typeof content === "string" ? [content] : content).map((delta) => ({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta })),
    { type: EventType.TEXT_MESSAGE_END, messageId },
    { type: EventType.RUN_FINISHED, threadId, runId },
  ].map((event) => encoder.encodeSSE(event)).join(""), { headers: { "Content-Type": "text/event-stream" } });
}
