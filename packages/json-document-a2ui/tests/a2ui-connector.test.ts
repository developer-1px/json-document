import { describe, expect, test, vi } from "vitest";
import { buildPointer } from "@interactive-os/json-document";
import { createA2uiStreamingDocumentEngine, parseA2uiMessage } from "../src/index.js";

const create = (surfaceId = "main") => ({ version: "v0.9", createSurface: { surfaceId, catalogId: "host-catalog" } });
const data = (value: unknown, path = "/answer", surfaceId = "main") => ({ version: "v0.9", updateDataModel: { surfaceId, path, value } });

describe("A2UI Connector public contract", () => {
  test("validates untrusted envelopes without coupling them to a product catalog", () => {
    expect(parseA2uiMessage(create())).toEqual(create());
    expect(() => parseA2uiMessage({ version: "v0.8", createSurface: {} })).toThrow();
    const engine = createA2uiStreamingDocumentEngine();
    expect(() => engine.dispatch({ invalid: true })).toThrow();
    expect(engine.document.value).toEqual({ surfaces: {} });
    engine.dispatch({ ...create(), createSurface: { ...create().createSurface, theme: { density: "compact" }, sendDataModel: true } });
    expect(engine.document.value).toEqual({ surfaces: { main: { catalogId: "host-catalog", theme: { density: "compact" }, sendDataModel: true, components: {}, dataModel: {} } } });
    engine.dispose();
  });

  test("is independent of every JSONL character split, CRLF, blank lines and final newline", () => {
    const jsonl = [create(), data("경계😀"), data(["first"], "/items"), data("second", "/items/-")].map((message) => JSON.stringify(message)).join("\r\n");
    for (let split = 0; split <= jsonl.length; split += 1) {
      const engine = createA2uiStreamingDocumentEngine();
      const messages = vi.fn();
      engine.message$.subscribe(messages);
      engine.write("\n  \r\n" + jsonl.slice(0, split));
      engine.write(jsonl.slice(split));
      engine.complete();
      engine.complete();
      expect(messages).toHaveBeenCalledTimes(4);
      expect(engine.document.at("/surfaces/main/dataModel")).toMatchObject({ ok: true, value: { answer: "경계😀", items: ["first", "second"] } });
      engine.dispose();
    }
  });

  test("complete flushes a stream, but permits a subsequent stream", () => {
    const engine = createA2uiStreamingDocumentEngine();
    const complete = vi.fn();
    engine.document$.subscribe({ complete });
    engine.write(JSON.stringify(create()));
    engine.complete();
    engine.write(JSON.stringify(data("next")) + "\n");
    engine.complete();
    expect(engine.document.at("/surfaces/main/dataModel/answer")).toMatchObject({ ok: true, value: "next" });
    expect(complete).not.toHaveBeenCalled();
    engine.dispose();
    expect(complete).toHaveBeenCalledOnce();
  });

  test("uses Core pointers for escaped and prototype-looking IDs and nested data keys", () => {
    const engine = createA2uiStreamingDocumentEngine();
    for (const id of ["a/b~c", "__proto__", "constructor"]) {
      engine.dispatch(create(id));
      engine.dispatch({ version: "v0.9", updateComponents: { surfaceId: id, components: [{ id, component: "Custom" }] } });
      engine.dispatch(data({ "a/b~c": "nested" }, "/", id));
      engine.dispatch(data("changed", "/a~1b~0c", id));
      expect(engine.document.at(buildPointer(["surfaces", id, "components", id]))).toMatchObject({ ok: true, value: { id, component: "Custom" } });
      expect(engine.document.at(buildPointer(["surfaces", id, "dataModel", "a/b~c"]))).toMatchObject({ ok: true, value: "changed" });
    }
    expect({}).not.toHaveProperty("component");
    engine.dispose();
  });

  test("injects isolated initial data and validates the entire component batch before mutation", () => {
    const initial = { content: {} };
    const validateComponent = vi.fn((component: { component: string }) => {
      if (component.component === "Unsupported") throw new Error("host.unsupported");
    });
    const engine = createA2uiStreamingDocumentEngine({ initialDataModel: initial, validateComponent });
    Object.assign(initial.content, { leaked: true });
    engine.dispatch(create());
    engine.dispatch(create("second"));
    engine.dispatch(data("first", "/content/value"));
    expect(engine.document.at("/surfaces/second/dataModel")).toMatchObject({ ok: true, value: { content: {} } });
    const before = engine.document.value;
    expect(() => engine.dispatch({ version: "v0.9", updateComponents: { surfaceId: "main", components: [
      { id: "ok", component: "Custom" }, { id: "bad", component: "Unsupported" },
    ] } })).toThrow("host.unsupported");
    expect(engine.document.value).toBe(before);
    expect(validateComponent).toHaveBeenCalledTimes(2);
    expect(validateComponent.mock.calls[0]?.[0]).toEqual({ id: "ok", component: "Custom" });
    engine.dispose();
  });

  test("observes direct document commits once, while message$ only reports accepted messages", () => {
    const engine = createA2uiStreamingDocumentEngine();
    const snapshots = vi.fn();
    const messages = vi.fn();
    engine.document$.subscribe(snapshots);
    engine.message$.subscribe(messages);
    engine.dispatch(create());
    engine.document.commit([{ op: "add", path: "/surfaces/main/dataModel/direct", value: true }]);
    engine.dispatch({ version: "v0.9", deleteSurface: { surfaceId: "absent" } });
    expect(snapshots).toHaveBeenCalledTimes(3);
    expect(messages).toHaveBeenCalledTimes(2);
    expect(snapshots.mock.lastCall?.[0]).toBe(engine.document.value);
    engine.dispose();
  });

  test("throws schema, JSON, pointer and commit errors without publishing failed messages", () => {
    const engine = createA2uiStreamingDocumentEngine();
    const messages = vi.fn();
    engine.message$.subscribe(messages);
    engine.dispatch(create());
    const before = engine.document.value;
    for (const candidate of [{}, data("invalid", "relative"), data("invalid", "/missing/child")]) {
      expect(() => engine.dispatch(candidate)).toThrow();
      expect(engine.document.value).toBe(before);
    }
    expect(() => engine.write("not-json\n")).toThrow();
    engine.write("{");
    expect(() => engine.complete()).toThrow();
    engine.complete();
    engine.write(JSON.stringify(data("recovered")) + "\n");
    expect(messages).toHaveBeenCalledTimes(2);
    expect(engine.document.at("/surfaces/main/dataModel/answer")).toMatchObject({ ok: true, value: "recovered" });
    engine.dispose();
  });

  test("stream errors keep prior accepted lines, discard the rest of that chunk and keep its incomplete tail", () => {
    const engine = createA2uiStreamingDocumentEngine();
    const tail = JSON.stringify(data("tail"));
    expect(() => engine.write([JSON.stringify(create()), "bad", JSON.stringify(data("discarded")), tail.slice(0, 10)].join("\n"))).toThrow();
    expect(engine.document.at("/surfaces/main/dataModel")).toMatchObject({ ok: true, value: {} });
    engine.write(tail.slice(10));
    engine.complete();
    expect(engine.document.at("/surfaces/main/dataModel/answer")).toMatchObject({ ok: true, value: "tail" });
    engine.dispose();
  });

  test("keeps null distinct from omitted value and deletes data roots or surfaces", () => {
    const engine = createA2uiStreamingDocumentEngine({ initialDataModel: null });
    engine.dispatch(create());
    expect(engine.document.at("/surfaces/main/dataModel")).toMatchObject({ ok: true, value: null });
    engine.dispatch(data({ kept: null, removed: true }, "/"));
    engine.dispatch(data(undefined, "/removed"));
    expect(engine.document.at("/surfaces/main/dataModel")).toMatchObject({ ok: true, value: { kept: null } });
    engine.dispatch(data(undefined, ""));
    expect(engine.document.at("/surfaces/main/dataModel")).toMatchObject({ ok: true, value: null });
    engine.dispatch({ version: "v0.9", deleteSurface: { surfaceId: "main" } });
    expect(engine.document.value).toEqual({ surfaces: {} });
    engine.dispose();
  });

  test("dispose discards pending input, completes observers once and rejects further engine writes", () => {
    const engine = createA2uiStreamingDocumentEngine();
    const state = vi.fn();
    const stateComplete = vi.fn();
    const messageComplete = vi.fn();
    engine.document$.subscribe({ next: state, complete: stateComplete });
    engine.message$.subscribe({ complete: messageComplete });
    engine.write(JSON.stringify(create()));
    engine.dispose();
    engine.dispose();
    expect(() => engine.dispatch(create())).toThrow("a2ui.disposed");
    expect(() => engine.write("")).toThrow("a2ui.disposed");
    expect(() => engine.complete()).toThrow("a2ui.disposed");
    engine.document.commit([{ op: "add", path: "/surfaces/external", value: {} }]);
    expect(state).toHaveBeenCalledOnce();
    expect(stateComplete).toHaveBeenCalledOnce();
    expect(messageComplete).toHaveBeenCalledOnce();
  });
});
