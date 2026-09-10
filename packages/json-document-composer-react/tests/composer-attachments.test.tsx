import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { COMPOSER_HOST_PROFILE_V1, composerText, type ComposerHostConfig } from "@interactive-os/json-document-composer";
import type { readWebRasterFile, WebRasterSourceResult } from "@interactive-os/json-document-web";
import { useComposer } from "../src/index.js";
import type { ClipboardEvent, KeyboardEvent } from "react";

afterEach(cleanup);
const file = { name: "image.png", size: 3, type: "image/png" };
const image = { ok: true as const, dataURL: "data:image/png;base64,AQID", width: 100, height: 50 };
const config: ComposerHostConfig<"fast"> = {
  profile: COMPOSER_HOST_PROFILE_V1, models: [{ id: "fast", value: "fast", label: "Fast", description: "Model" }], suggestions: [],
  attachments: { acceptedMediaTypes: ["*/*"], maxFiles: 4, maxBytesPerFile: 100 }, interaction: { submit: "enter", newline: "shift-enter" },
};
function waiting() {
  let resolve!: (result: WebRasterSourceResult) => void;
  const promise = new Promise<WebRasterSourceResult>((done) => { resolve = done; });
  return { promise, resolve };
}
function setup(readRaster: typeof readWebRasterFile = vi.fn(async () => image), policy = config.attachments) {
  let id = 0;
  const submit = vi.fn(async () => undefined);
  const hook = renderHook(() => useComposer({ id: "composer", config: { ...config, attachments: policy }, ports: { createId: () => `id-${++id}`, submit }, labels: { mentionSuggestions: "Mentions", skillSuggestions: "Skills" }, readRaster }));
  return { ...hook, submit, readRaster };
}
function key(key: string, metaKey = false) {
  return { key, metaKey, preventDefault: vi.fn(), stopPropagation: vi.fn(), nativeEvent: { isComposing: false, stopImmediatePropagation: vi.fn() } } as unknown as KeyboardEvent<HTMLElement>;
}

test("PI-CONTENT: decoded images survive draft serialization, submit, removal, and Undo/Redo", async () => {
  const { result, submit } = setup();
  await act(async () => { result.current.addWebFiles([file]); });
  const attachment = result.current.attachments[0]!;
  expect(attachment).toMatchObject({ id: "id-4", name: file.name, image: { source: image.dataURL, width: 100, height: 50 } });
  expect(JSON.parse(JSON.stringify(result.current.draft)).attachments[0]).toEqual(attachment);
  act(() => { result.current.submit(); }); expect(submit).toHaveBeenCalledWith(result.current.draft);
  act(() => { result.current.removeAttachment(attachment.id); }); expect(result.current.attachments).toEqual([]);
  act(() => { result.current.editor.undo(); }); expect(result.current.attachments).toEqual([attachment]);
  act(() => { result.current.editor.undo(); }); expect(result.current.attachments).toEqual([]);
  act(() => { result.current.editor.redo(); }); expect(result.current.attachments).toEqual([attachment]);
});

test("PI-TYPING/PI-ORDER: typing and caret movement continue; requests append in input order with separate Undo", async () => {
  const first = waiting(), second = waiting();
  const reader = vi.fn<typeof readWebRasterFile>().mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
  const { result, submit } = setup(reader);
  act(() => { result.current.addWebFiles([file]); result.current.addWebFiles([{ ...file, name: "second.png" }]); result.current.insertText("계속 입력"); });
  expect(result.current.isPreparingAttachments).toBe(true); expect(result.current.canSubmit).toBe(false);
  const focus = result.current.editor.snapshot.selection.ranges[0]!.focus;
  expect(focus.kind).toBe("text");
  if (focus.kind !== "text") return;
  const caret = { ...focus, offset: 0 };
  const selection = { kind: "range" as const, ranges: [{ anchor: caret, focus: caret }], primaryIndex: 0 };
  act(() => { result.current.editor.dispatch({ type: "selection.set", selection }); result.current.submit(); });
  expect(submit).not.toHaveBeenCalled();
  await act(async () => { second.resolve(image); }); expect(result.current.attachments).toEqual([]);
  await act(async () => { first.resolve(image); });
  expect(result.current.attachments.map((attachment) => attachment.name)).toEqual([file.name, "second.png"]);
  expect(composerText(result.current.draft.instruction)).toBe("계속 입력");
  expect(result.current.editor.snapshot.selection).toEqual(selection); expect(result.current.canSubmit).toBe(true);
  act(() => { result.current.handleHistoryKeyDown(key("z", true)); }); expect(result.current.attachments).toHaveLength(1);
  act(() => { result.current.handleHistoryKeyDown(key("z", true)); }); expect(result.current.attachments).toHaveLength(0);
  expect(composerText(result.current.draft.instruction)).toBe("계속 입력");
});

test.each(["escape", "cancel", "undo", "unmount"])("PI-CANCEL: %s aborts preparation and cannot revive a late image", async (reason) => {
  const pending = waiting();
  const reader = vi.fn<typeof readWebRasterFile>(() => pending.promise);
  const { result, unmount } = setup(reader);
  act(() => { result.current.addWebFiles([file]); });
  const document = result.current.document;
  const initial = document.value;
  act(() => {
    if (reason === "escape") result.current.handleKeyDown(key("Escape"));
    else if (reason === "cancel") result.current.cancelAttachments();
    else if (reason === "undo") result.current.handleHistoryKeyDown(key("z", true));
    else unmount();
  });
  expect(reader.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  await act(async () => { pending.resolve(image); }); expect(document.value).toEqual(initial);
});

test("PI-FILE: failed image batch leaves neither metadata-only remnants nor History", async () => {
  const reader = vi.fn<typeof readWebRasterFile>().mockResolvedValueOnce(image).mockResolvedValueOnce({ ok: false, code: "raster.decode-failed" });
  const { result } = setup(reader);
  await act(async () => { result.current.addWebFiles([file, file]); });
  expect(result.current.attachments).toEqual([]); expect(result.current.editor.snapshot.canUndo).toBe(false);
  expect(result.current.attachmentError?.code).toBe("raster.decode-failed"); expect(result.current.isPreparingAttachments).toBe(false);
});

test("queued requests revalidate the latest attachment count before ID allocation", async () => {
  const first = waiting();
  const reader = vi.fn<typeof readWebRasterFile>().mockImplementationOnce(() => first.promise).mockResolvedValue(image);
  const { result } = setup(reader, { ...config.attachments, maxFiles: 1 });
  act(() => { result.current.addWebFiles([file]); result.current.addWebFiles([{ ...file, name: "overflow.png" }]); });
  await act(async () => { first.resolve(image); });
  expect(result.current.attachments).toHaveLength(1); expect(result.current.attachmentError?.code).toBe("composer.attachments.limit");
  act(() => { result.current.removeAttachment(result.current.attachments[0]!.id); });
  await act(async () => { result.current.addWebFiles([file]); }); expect(result.current.attachments[0]!.id).toBe("id-5");
});

test("file-only native paste consumes images once and delegates text/HTML to Rich Text", async () => {
  const { result } = setup();
  const preventDefault = vi.fn(), stopPropagation = vi.fn();
  const event = (files: typeof file[], types: string[]) => ({ clipboardData: { files, types, getData: () => "<p>text</p>", setData() {} }, preventDefault, stopPropagation }) as unknown as ClipboardEvent<HTMLElement>;
  act(() => { result.current.handlePaste(event([], ["text/html", "text/plain"])); });
  expect(preventDefault).not.toHaveBeenCalled(); expect(stopPropagation).not.toHaveBeenCalled();
  await act(async () => { result.current.handlePaste(event([file], ["Files", "text/html"])); });
  expect(result.current.attachments).toHaveLength(1); expect(preventDefault).toHaveBeenCalledOnce(); expect(stopPropagation).toHaveBeenCalledOnce();
});
