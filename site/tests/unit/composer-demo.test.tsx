import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { ComposerDemoRoute } from "../../src/routes/composer-demo/ComposerDemoRoute";
import composerDemoSource from "../../src/routes/composer-demo/ComposerDemoRoute.tsx?raw";

afterEach(cleanup);

describe("Agent Chat Composer Hands", () => {
  test("keeps draft patches and Web file projection out of the Host route", () => {
    expect(composerDemoSource).not.toContain("editor.apply(");
    expect(composerDemoSource).not.toContain("function composerAttachments");
    expect(composerDemoSource).toContain("addComposerAttachments(");
    expect(composerDemoSource).toContain("composerAttachmentCandidatesFromWebFiles(");
    expect(composerDemoSource).not.toContain("composer-placeholder-box");
    expect(composerDemoSource).toContain('placeholder="작업을 입력하세요"');
    expect(composerDemoSource).toContain("useComposerCommandMenu(");
    expect(composerDemoSource).toContain("<ComposerReferenceAtom");
    expect(composerDemoSource).toContain("renderExtension={renderComposerReference}");
    expect(composerDemoSource).not.toContain("renderExtension={(node)");
    expect(composerDemoSource).toContain("formatFileSize(file.size)");
    expect(composerDemoSource).not.toContain("hostConfig.suggestions.filter(");
    expect(composerDemoSource).not.toContain("commandActiveId");
    expect(composerDemoSource).not.toContain("function renderAtom");
    expect(composerDemoSource).not.toContain("function formatBytes");
  });

  test("delegates empty-state placeholder lifecycle to the canonical Rich Text surface", () => {
    render(<ComposerDemoRoute />);
    const editor = screen.getByLabelText("Agent Chat Composer");
    expect(editor.getAttribute("aria-placeholder")).toBe("작업을 입력하세요");
    expect(editor.getAttribute("data-rich-text-empty")).toBe("true");
    expect(editor.querySelector('[data-rich-text-placeholder="작업을 입력하세요"]')).toBeTruthy();
    expect(editor.textContent).toBe("");
  });

  test("keeps attachments in the canonical Composer draft and removes them from the same context", () => {
    render(<ComposerDemoRoute />);
    const input = screen.getByLabelText("파일 첨부") as HTMLInputElement;
    const file = new File(["canonical"], "요구사항.md", { type: "text/markdown" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("요구사항.md")).toBeTruthy();
    expect(screen.getByTestId("composer-draft-json").textContent).toContain("요구사항.md");
    expect(screen.getByRole("button", { name: "전송 (Enter)" }).hasAttribute("disabled")).toBe(false);

    fireEvent.keyDown(screen.getByTestId("agent-chat-composer"), { key: "z", metaKey: true });
    expect(screen.queryByText("요구사항.md")).toBeNull();
    fireEvent.keyDown(screen.getByTestId("agent-chat-composer"), { key: "z", metaKey: true, shiftKey: true });
    expect(screen.getByText("요구사항.md")).toBeTruthy();

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

    fireEvent.click(screen.getByRole("button", { name: "모델 선택" }));
    expect(screen.getByRole("listbox", { name: "모델 선택" })).toBeTruthy();
    expect(screen.getByRole("option", { name: /GPT-5.6/ })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Claude Sonnet/ })).toBeTruthy();
    expect(screen.queryByText(/HCX/)).toBeNull();
  });

  test("routes dropped files through the same canonical attachment context", () => {
    render(<ComposerDemoRoute />);
    const composer = screen.getByTestId("agent-chat-composer");
    const file = new File(["drop"], "드롭.pdf", { type: "application/pdf" });

    fireEvent.dragEnter(composer, { dataTransfer: { files: [file] } });
    expect(screen.getByText("여기에 파일을 놓아주세요")).toBeTruthy();
    fireEvent.drop(composer, { dataTransfer: { files: [file] } });

    expect(screen.getByText("드롭.pdf")).toBeTruthy();
    expect(screen.getByTestId("composer-draft-json").textContent).toContain("드롭.pdf");
  });
});
