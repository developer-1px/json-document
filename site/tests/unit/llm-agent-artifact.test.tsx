import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { EventType } from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";
import { LlmAgentArtifactRoute } from "../../src/routes/llm-agent-artifact/LlmAgentArtifactRoute";

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
});

function agUiResponse(threadId: string, content: string) {
  const encoder = new EventEncoder();
  const runId = "run-test";
  const messageId = "message-test";
  return new Response([
    { type: EventType.RUN_STARTED, threadId, runId },
    { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" },
    { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: content },
    { type: EventType.TEXT_MESSAGE_END, messageId },
    { type: EventType.RUN_FINISHED, threadId, runId },
  ].map((event) => encoder.encodeSSE(event)).join(""), { headers: { "Content-Type": "text/event-stream" } });
}
