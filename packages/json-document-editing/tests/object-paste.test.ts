import { expect, test, vi } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createCanvasClipboard, createObjectEditor, createObjectPasteSession, objectClipboardFormat, type ObjectPastePreparation } from "../src/index.js";
import type { CanvasDocument } from "@interactive-os/json-document-object-document";

const blank: CanvasDocument = { profile: "canvas/1", width: 1280, height: 720, objects: [] };
const options = { bounds: { x: 0, y: 0, width: 600, height: 400 }, textColor: "black", fontSize: 32 };
const placement = { type: "cascade", dx: 24, dy: 24 } as const;
const payload = (text: string) => createCanvasClipboard({ type: "text", text }, options);
function setup() {
  let id = 0;
  const document = createJSONDocument(blank);
  const editor = createObjectEditor(document, { createId: () => `object-${++id}` });
  const commits = vi.fn(); document.subscribe(commits);
  return { editor, commits, value: () => editor.snapshot.value as CanvasDocument };
}
function deferred() {
  let resolve!: (value: ObjectPastePreparation) => void;
  const promise = new Promise<ObjectPastePreparation>((done) => { resolve = done; });
  return { promise, resolve };
}

test("literal Unicode text and decoded rasters become validated domain clipboard with temporary source identities", () => {
  const text = payload("<b>안녕</b>\nSecond line");
  expect(text.objects[0]).toMatchObject({ id: "clipboard:0", kind: "text", label: "<b>안녕</b>\nSecond line", fontSize: 32, height: 76.8 });
  const images = createCanvasClipboard({ type: "images", images: [
    { source: "data:image/png;base64,AQID", width: 1200, height: 400, label: "first.png" },
    { source: "data:image/webp;base64,AQID", width: 100, height: 50, label: "second.webp" },
  ] }, options);
  expect(images.objects.map((object) => [object.x, object.y, object.width, object.height])).toEqual([[0, 0, 600, 200], [24, 24, 100, 50]]);
  expect(images.primaryKey).toBe("clipboard:1"); expect(images.text).toBe("first.png\nsecond.webp");
  expect(objectClipboardFormat.parse(images)).toEqual(images);
  expect(() => payload("")).toThrow();
  expect(() => createCanvasClipboard({ type: "images", images: [] }, options)).toThrow();
  expect(() => createCanvasClipboard({ type: "text", text: "x" }, { ...options, fontSize: NaN })).toThrow();
});

test("cascade finds a free group origin, preserves relative bounds and primary, and reuses undone positions without a counter", () => {
  const { editor, value } = setup();
  const clipboard = createCanvasClipboard({ type: "images", images: [
    { source: "data:image/png;base64,AQID", width: 100, height: 100, label: "A" },
    { source: "data:image/png;base64,AQID", width: 100, height: 100, label: "B" },
  ] }, options);
  for (let index = 0; index < 2; index++) expect(editor.dispatch({ type: "clipboard.paste", clipboard, placement }).ok).toBe(true);
  expect(value().objects.map((object) => object.x)).toEqual([24, 48, 72, 96]);
  expect(editor.snapshot.selection).toMatchObject({ keys: ["object-3", "object-4"], primaryKey: "object-4" });
  editor.undo();
  editor.dispatch({ type: "clipboard.paste", clipboard, placement });
  expect(value().objects.map((object) => object.x)).toEqual([24, 48, 72, 96]);
  const before = editor.snapshot;
  expect(editor.dispatch({ type: "clipboard.paste", clipboard, placement: { type: "cascade", dx: 0, dy: 0 } }).ok).toBe(false);
  expect(editor.snapshot).toEqual(before);
});

test("async preparation completes out of order but commits in request order, one Undo each", async () => {
  const { editor, commits, value } = setup();
  const onResult = vi.fn(), onPendingChange = vi.fn();
  const session = createObjectPasteSession(editor, { placement, onResult, onPendingChange });
  const first = deferred(), second = deferred();
  const a = session.enqueue(() => first.promise), b = session.enqueue(() => second.promise);
  const c = session.enqueue(() => ({ ok: true, clipboard: payload("C") }));
  second.resolve({ ok: true, clipboard: payload("B") }); await Promise.resolve();
  expect(session.pending).toBe(true); expect(commits).not.toHaveBeenCalled();
  first.resolve({ ok: true, clipboard: payload("A") });
  expect((await Promise.all([a, b, c])).every((result) => result.ok)).toBe(true);
  expect(value().objects.map((object) => [object.label, object.x])).toEqual([["A", 24], ["B", 48], ["C", 72]]);
  expect(commits).toHaveBeenCalledTimes(3); expect(onResult).toHaveBeenCalledTimes(3);
  expect(session.pending).toBe(false); expect(onPendingChange.mock.calls).toEqual([[true], [false]]);
  editor.undo(); expect(value().objects.map((object) => object.label)).toEqual(["A", "B"]);
  editor.undo(); expect(value().objects.map((object) => object.label)).toEqual(["A"]);
  editor.undo(); expect(value()).toEqual(blank);
});

test.each(["cancel", "selection", "document"])("%s invalidates pending and ready work without stale commits, ID allocation or late callbacks", async (reason) => {
  const { editor, value } = setup();
  const onResult = vi.fn(), abort = vi.fn();
  const session = createObjectPasteSession(editor, { placement, onResult });
  const first = deferred();
  const a = session.enqueue(() => first.promise, abort), b = session.enqueue(() => ({ ok: true, clipboard: payload("B") }));
  if (reason === "cancel") session.cancel();
  else if (reason === "selection") editor.dispatch({ type: "selection.set", objectIds: [] });
  else editor.dispatch({ type: "document.replace", document: { ...blank, title: "New slide" } });
  expect(await a).toMatchObject({ ok: false, code: "clipboard.cancelled" });
  expect(await b).toMatchObject({ ok: false, code: "clipboard.cancelled" });
  first.resolve({ ok: true, clipboard: payload("A") }); await Promise.resolve();
  expect(value().objects).toEqual([]); expect(onResult).not.toHaveBeenCalled(); expect(abort).toHaveBeenCalledOnce();
  expect((await session.enqueue(() => ({ ok: true, clipboard: payload("Fresh") }))).ok).toBe(true);
  expect(value().objects[0]!.id).toBe("object-1");
});

test("sync content commits synchronously; rejected preparation does not poison the queue", async () => {
  const { editor, value, commits } = setup();
  const session = createObjectPasteSession(editor, { placement });
  const bad = session.enqueue(() => Promise.reject(new Error("decode failed")));
  const good = session.enqueue(() => ({ ok: true, clipboard: payload("Valid") }));
  expect(await bad).toMatchObject({ ok: false, reason: "decode failed" });
  expect((await good).ok).toBe(true); expect(commits).toHaveBeenCalledOnce();
  const sync = session.enqueue(() => ({ ok: true, clipboard: payload("Now") }));
  expect(value().objects.at(-1)!.label).toBe("Now"); await sync;
});

test("throwing observers and cleanup callbacks cannot strand the queue or change a completed edit", async () => {
  const { editor, value } = setup();
  const throwing = () => { throw new Error("observer failed"); };
  const session = createObjectPasteSession(editor, { onResult: throwing, onPendingChange: throwing });
  const first = deferred();
  const a = session.enqueue(() => first.promise), b = session.enqueue(() => ({ ok: true, clipboard: payload("B") }));
  first.resolve({ ok: true, clipboard: payload("A") });
  expect((await Promise.all([a, b])).every((result) => result.ok)).toBe(true);
  expect(value().objects.map((object) => object.label)).toEqual(["A", "B"]);
  const next = deferred();
  const c = session.enqueue(() => next.promise, throwing), d = session.enqueue(() => next.promise, throwing);
  expect(() => session.cancel()).not.toThrow();
  expect((await Promise.all([c, d])).every((result) => !result.ok && result.code === "clipboard.cancelled")).toBe(true);
});
