import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { LlmAgentArtifactRoute } from "../../src/routes/llm-agent-artifact/LlmAgentArtifactRoute";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/artifact/llm-agent");
});

describe("LLM Agent Artifact", () => {
  test("sends a plain chat message and renders the Codex stream", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => String(input).endsWith("/threads")
      ? Promise.resolve(Response.json({ threads: [] }))
      : Promise.resolve(new Response("연결완료", { headers: { "X-Codex-Thread-Id": "thread-123" } }))));
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
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => String(input).endsWith("/threads")
      ? Promise.resolve(Response.json({ threads: [{ id: "thread-saved", preview: "이전 채팅", updatedAt: 1 }] }))
      : Promise.resolve(new Response("계속완료", { headers: { "X-Codex-Thread-Id": "thread-saved" } })));
    vi.stubGlobal("fetch", fetchMock);
    render(<LlmAgentArtifactRoute />);

    await waitFor(() => screen.getByRole("button", { name: "이전 채팅" }));
    fireEvent.click(screen.getByRole("button", { name: "이전 채팅" }));
    fireEvent.change(screen.getByLabelText("메시지"), { target: { value: "계속해줘" } });
    fireEvent.click(screen.getByRole("button", { name: "전송" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("계속완료"));
    const request = fetchMock.mock.calls.find(([input]) => !String(input).endsWith("/threads"));
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({ sessionId: "thread-saved", prompt: "계속해줘" });
  });
});
