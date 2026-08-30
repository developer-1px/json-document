import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { LlmAgentArtifactRoute } from "../../src/routes/llm-agent-artifact/LlmAgentArtifactRoute";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LLM Agent Artifact", () => {
  test("reuses the canonical Composer and renders the Codex stream", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("연결완료")));
    render(<LlmAgentArtifactRoute />);

    expect(screen.getByText("Local Codex")).toBeTruthy();
    expect(screen.queryByText("Canonical Composer draft")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /전략 기획서 초안 작성/ }));
    fireEvent.click(screen.getByRole("button", { name: "전송 (Enter)" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("연결완료"));
  });
});
