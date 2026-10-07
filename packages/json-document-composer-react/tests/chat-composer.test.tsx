import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { COMPOSER_HOST_PROFILE_V1, composerText, type ComposerDraft, type ComposerHostConfig } from "@interactive-os/json-document-composer";
import { ChatComposer, useComposer } from "../src/index.js";

afterEach(cleanup);
const config: ComposerHostConfig = {
  profile: COMPOSER_HOST_PROFILE_V1,
  models: [{ id: "local", value: "local", label: "Local", description: "Test" }],
  suggestions: [],
  attachments: { acceptedMediaTypes: [], maxFiles: null, maxBytesPerFile: null },
  interaction: { submit: "enter", newline: "shift-enter" },
};
function setup(submit: (draft: ComposerDraft) => Promise<void> = vi.fn(async () => {}), shouldClearAfterSubmit = true) {
  let id = 0;
  return { submit, ...renderHook(() => useComposer({
    id: "chat", config, ports: { createId: () => `chat-${++id}`, submit },
    labels: { mentionSuggestions: "Mentions", skillSuggestions: "Skills" }, shouldClearAfterSubmit,
  })) };
}

test("accepts once while pending, clears the accepted draft, and allows another message", async () => {
  let accept!: () => void;
  const submit = vi.fn((_draft: ComposerDraft) => new Promise<void>((resolve) => { accept = resolve; }));
  const { result } = setup(submit);
  act(() => { result.current.insertText("첫 메시지"); });
  act(() => { result.current.submit(); result.current.submit(); });
  expect(submit).toHaveBeenCalledTimes(1);
  expect(result.current.isSubmitting).toBe(true);
  expect(result.current.canSubmit).toBe(false);
  await act(async () => { accept(); });
  expect(composerText(result.current.draft.instruction)).toBe("");
  expect(result.current.isSubmitting).toBe(false);
  act(() => { result.current.insertText("다음 메시지"); result.current.submit(); });
  expect(submit).toHaveBeenCalledTimes(2);
  expect(composerText(submit.mock.calls[1]![0]!.instruction)).toBe("다음 메시지");
  await act(async () => { accept(); });
});

test("preserves changes typed during submission", async () => {
  let accept!: () => void;
  const { result } = setup(vi.fn(() => new Promise<void>((resolve) => { accept = resolve; })));
  act(() => { result.current.insertText("first"); result.current.submit(); });
  act(() => { result.current.insertText(" next"); });
  const current = result.current.document.value;
  await act(async () => { accept(); });
  expect(result.current.document.value).toBe(current);
  expect(composerText(result.current.draft.instruction)).toBe("first next");
});

test("failed submissions preserve the draft and expose an error until retry", async () => {
  const failure = new Error("offline");
  const submit = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(undefined);
  const { result } = setup(submit);
  act(() => { result.current.insertText("keep me"); });
  await act(async () => { result.current.submit(); });
  expect(result.current.submitError).toBe(failure);
  expect(composerText(result.current.draft.instruction)).toBe("keep me");
  expect(result.current.canSubmit).toBe(true);
  await act(async () => { result.current.submit(); });
  expect(result.current.submitError).toBe(null);
  expect(composerText(result.current.draft.instruction)).toBe("");
});

test("default Hosts retain drafts and opt-in clear is undoable", async () => {
  const retained = setup(undefined, false);
  act(() => { retained.result.current.insertText("keep"); });
  await act(async () => { retained.result.current.submit(); });
  expect(composerText(retained.result.current.draft.instruction)).toBe("keep");
  const cleared = setup();
  act(() => { cleared.result.current.insertText("restore"); });
  await act(async () => { cleared.result.current.submit(); });
  act(() => { cleared.result.current.editor.undo(); });
  expect(composerText(cleared.result.current.draft.instruction)).toBe("restore");
});

test("ChatComposer uses the binding for Enter, IME, newline and pointer submit", async () => {
  const { result, submit } = setup();
  const view = () => <ChatComposer composer={result.current} label="Message" submitLabel="Send" submitErrorLabel="Try again" placeholder="Write a message" />;
  const rendered = render(view());
  expect((screen.getByRole("button", { name: "Send" }) as HTMLButtonElement).disabled).toBe(true);
  act(() => { result.current.insertText("hello"); });
  rendered.rerender(view());
  const input = screen.getByRole("textbox", { name: "Message" });
  expect(fireEvent.keyDown(input, { key: "Enter", isComposing: true })).toBe(true);
  expect(fireEvent.keyDown(input, { key: "Enter", keyCode: 229 })).toBe(true);
  fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
  expect(submit).not.toHaveBeenCalled();
  await act(async () => { fireEvent.keyDown(input, { key: "Enter" }); });
  expect(submit).toHaveBeenCalledOnce();
  act(() => { result.current.insertText("again"); });
  rendered.rerender(view());
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send" })); });
  expect(submit).toHaveBeenCalledTimes(2);
});

test("submission failures have visible accessible copy", async () => {
  const { result } = setup(vi.fn(async () => { throw new Error("offline"); }));
  act(() => { result.current.insertText("keep"); });
  await act(async () => { result.current.submit(); });
  render(<ChatComposer composer={result.current} label="Message" submitLabel="Send" submitErrorLabel="Try again" />);
  expect(screen.getByRole("alert").textContent).toBe("Try again");
  expect(screen.getByRole("textbox").getAttribute("aria-describedby")).toBe(screen.getByRole("alert").id);
});
