import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { ComposerDemoRoute } from "../../src/routes/composer-demo/ComposerDemoRoute";

afterEach(cleanup);

describe("Agent Chat Composer Hands", () => {
  test("keeps attachments in the canonical Composer draft and removes them from the same context", () => {
    render(<ComposerDemoRoute />);
    const input = screen.getByLabelText("파일 첨부") as HTMLInputElement;
    const file = new File(["canonical"], "요구사항.md", { type: "text/markdown" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("요구사항.md")).toBeTruthy();
    expect(screen.getByTestId("composer-draft-json").textContent).toContain("요구사항.md");
    expect(screen.getByRole("button", { name: "전송 (Enter)" }).hasAttribute("disabled")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "요구사항.md 제거" }));
    expect(screen.queryByText("요구사항.md")).toBeNull();
    expect(screen.getByTestId("composer-draft-json").textContent).not.toContain("요구사항.md");
  });

  test("opens the Cstar-shaped add and model layers from real controls", () => {
    render(<ComposerDemoRoute />);
    fireEvent.click(screen.getByRole("button", { name: "추가" }));
    expect(screen.getByRole("menuitem", { name: /파일 업로드/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /스킬/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /에이전트/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "HCX 30B⌄" }));
    expect(screen.getByRole("listbox", { name: "모델 선택" })).toBeTruthy();
  });
});
