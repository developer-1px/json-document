// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { createWebInteractionRecorder, registerWebInteractionSource, traceWebInteraction } from "../src/interaction-recording.js";
import { bindWebRecordingArchive, createWebRecordingArchive } from "../src/interaction-recording-archive.js";

const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).forEach(dispose => dispose()); document.body.replaceChildren(); localStorage.clear(); });
function setup() {
  const root = document.createElement("div");
  root.setAttribute("contenteditable", "true");
  document.body.append(root);
  const recorder = createWebInteractionRecorder({ document });
  cleanup.push(() => recorder.dispose());
  return { root, recorder };
}

test("REC correlates native input and owner commits without changing event cancellation", async () => {
  const { root, recorder } = setup();
  const read = vi.fn(() => ({ value: root.textContent }));
  traceWebInteraction(root, "idle", read);
  expect(read).not.toHaveBeenCalled();
  cleanup.push(registerWebInteractionSource(root, "editor", read));
  root.addEventListener("beforeinput", event => {
    traceWebInteraction(root, "command.insert", () => ({ value: "한\n" }), event);
    event.preventDefault();
    root.textContent = "한\n";
    traceWebInteraction(root, "model.commit", read, event);
  });
  recorder.start();
  const event = new InputEvent("beforeinput", { inputType: "insertParagraph", bubbles: true, cancelable: true });
  root.dispatchEvent(event);
  await Promise.resolve();
  const recording = recorder.stop()!;
  const capture = recording.records.find(record => record.kind === "event.capture")!;
  const after = recording.records.find(record => record.kind === "event.after-dispatch")!;
  const command = recording.records.find(record => record.kind === "command.insert")!;
  expect(capture.eventId).toBe(command.eventId);
  expect(command.eventId).toBe(after.eventId);
  expect(capture.detail).toMatchObject({ defaultPrevented: false });
  expect(after.detail).toMatchObject({ defaultPrevented: true, dom: { text: "한\n" } });
  expect(recording.records.some(record => record.kind === "dom.mutation")).toBe(true);
  expect(recording.records.some(record => record.kind === "editor.initial")).toBe(true);
  root.dispatchEvent(new KeyboardEvent("keydown", { key: "x", bubbles: true }));
  expect(recorder.snapshot()!.records).toHaveLength(recording.records.length);
});

test("passwords, private descendants, and REC controls never enter evidence", async () => {
  const { root, recorder } = setup();
  root.innerHTML = '<span data-recording-private>secret</span>';
  const password = document.createElement("input");
  password.type = "password"; password.value = "password-secret";
  document.body.append(password);
  recorder.start();
  password.dispatchEvent(new KeyboardEvent("keydown", { key: "s", bubbles: true }));
  traceWebInteraction(root, "private", () => ({ value: "secret" }));
  await Promise.resolve();
  expect(JSON.stringify(recorder.stop())).not.toContain("secret");
});

test("recording size limit stops explicitly and preserves earlier evidence", () => {
  const { root } = setup();
  const recorder = createWebInteractionRecorder({ document, maxRecords: 2 });
  cleanup.push(() => recorder.dispose());
  recorder.start();
  for (let i = 0; i < 5; i++) traceWebInteraction(root, "sample", () => ({ i }));
  expect(recorder.recording).toBe(false);
  expect(recorder.snapshot()).toMatchObject({ reason: "limit", records: expect.any(Array) });
  expect(recorder.snapshot()!.records).toHaveLength(2);
});

test("failed server storage remains recoverable after recreating the archive", async () => {
  const { recorder } = setup();
  recorder.start();
  const recording = recorder.stop()!;
  const offline = createWebRecordingArchive({ endpoint: "/record", storage: localStorage, fetch: vi.fn().mockRejectedValue(new Error("offline")) });
  expect(await offline.save(recording)).toMatchObject({ ok: false, local: true });
  const online = createWebRecordingArchive({ endpoint: "/record", storage: localStorage, fetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: recording.id, path: "/saved.json" }) }) });
  expect(online.pending()[0]).toEqual(recording);
  expect(await online.save(online.pending()[0]!)).toMatchObject({ ok: true });
  expect(online.pending()).toEqual([]);
});


test("a checkpoint acknowledgement cannot erase a queued final recording", async () => {
  const { root, recorder } = setup();
  const replies: ((response: unknown) => void)[] = [];
  const fetch = vi.fn(() => new Promise(resolve => replies.push(resolve))) as unknown as typeof globalThis.fetch;
  const archive = createWebRecordingArchive({ endpoint: "/record", storage: localStorage, fetch });
  cleanup.push(bindWebRecordingArchive(recorder, archive, () => {}));
  recorder.start();
  traceWebInteraction(root, "commit", () => ({ value: "한" }));
  const final = recorder.stop()!;
  const response = { ok: true, json: async () => ({ id: final.id, path: "/saved.json" }) };
  expect(archive.pending()[0]!.endedAt).toBe(final.endedAt);
  replies[0]!(response);
  await vi.waitFor(() => expect(replies).toHaveLength(2));
  expect(archive.pending()[0]!.records).toEqual(final.records);
  replies[1]!(response);
  await vi.waitFor(() => expect(archive.pending()).toEqual([]));
});
