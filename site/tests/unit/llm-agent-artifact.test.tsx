import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { LlmAgentArtifactRoute } from "../../src/routes/llm-agent-artifact/LlmAgentArtifactRoute";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LLM Agent Artifact", () => {
  test("sends a plain chat message and renders the Codex stream", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("연결완료")));
    render(<LlmAgentArtifactRoute />);

    expect(screen.getByText("Local Codex")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("메시지"), { target: { value: "안녕" } });
    fireEvent.click(screen.getByRole("button", { name: "전송" }));

    expect(screen.getByText("안녕")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("연결완료"));
  });
});
