import { createJSONDocument } from "@interactive-os/json-document";
import { describe, expect, it } from "vitest";
import {
  createRichTextBlockFixture,
  createRichTextEditor,
  createRichTextInstrument,
  runWithRichTextInstrument,
  type RichTextDocument,
} from "../src/index.js";

describe("Official Rich Text local edit costs", () => {
  it("indexes topology during editor create in the same walk as validation", () => {
    const size = 256;
    const instrument = createRichTextInstrument();
    const editor = runWithRichTextInstrument(instrument, () => createRichTextEditor({
      document: createJSONDocument(createRichTextBlockFixture(size)),
    }));
    expect(editor.topology.locate("block-text-0")?.node).toMatchObject({ type: "text", text: "x" });
    expect(editor.topology.locate(`block-text-${size - 1}`)?.path).toEqual([size - 1, 0]);
    expect(instrument.snapshot().fullValidations).toBe(1);
    expect(instrument.snapshot().topologyCreates).toBe(1);
    expect(instrument.snapshot().topologyVisits).toBe(size * 2 + 1);
    expect(instrument.snapshot().topologyVisits).toBeLessThan(size * 3);
  });

  it("reuses topology for the same snapshot and adopts after a leaf commit", () => {
    const document = createJSONDocument(createRichTextBlockFixture(32));
    const instrument = createRichTextInstrument();
    const editor = runWithRichTextInstrument(instrument, () => {
      const created = createRichTextEditor({
        document,
        selection: collapsed("block-text-0", 1),
      });
      created.topology.locate("block-text-0");
      created.topology.interval(
        { kind: "text", nodeId: "block-text-0", offset: 0, affinity: "forward" },
        { kind: "text", nodeId: "block-text-0", offset: 1, affinity: "forward" },
      );
      created.dispatch({
        type: "selection.set",
        selection: collapsed("block-text-1", 1),
      });
      return created;
    });
    expect(instrument.snapshot().topologyCreates).toBe(1);
    expect(instrument.snapshot().topologyAdopts).toBe(0);

    instrument.reset();
    runWithRichTextInstrument(instrument, () => {
      editor.dispatch({ type: "text.insert", text: "y" });
      expect(editor.topology.locate("block-text-1")?.node).toMatchObject({ type: "text", text: "xy" });
    });
    expect(instrument.snapshot().topologyCreates).toBe(0);
    expect(instrument.snapshot().topologyAdopts).toBe(1);
    expect(instrument.snapshot().topologyVisits).toBeLessThan(16);
  });

  it("adopts topology on a second 10,000-block insert instead of walking every node", () => {
    const document = createJSONDocument(createRichTextBlockFixture(10_000));
    const editor = createRichTextEditor({
      document,
      selection: collapsed("block-text-5000", 1),
    });
    expect(editor.dispatch({ type: "text.insert", text: "y" }).ok).toBe(true);

    const instrument = createRichTextInstrument();
    const second = runWithRichTextInstrument(instrument, () => editor.dispatch({ type: "text.insert", text: "z" }));
    expect(second.ok).toBe(true);
    expect(editor.topology.locate("block-text-5000")?.node).toMatchObject({ type: "text", text: "xyz" });
    expect(editor.topology.locate("block-text-0")?.node).toMatchObject({ type: "text", text: "x" });
    expect(instrument.snapshot().topologyCreates).toBe(0);
    expect(instrument.snapshot().topologyAdopts).toBe(1);
    expect(instrument.snapshot().topologyVisits).toBeLessThan(16);
    expect(instrument.snapshot().contentCopies).toBe(0);
  });

  it("commits mark toggle and block split without a root replace", () => {
    const document = createJSONDocument(createRichTextBlockFixture(8));
    const editor = createRichTextEditor({
      document,
      selection: {
        kind: "range",
        ranges: [{
          anchor: { kind: "text", nodeId: "block-text-2", offset: 0, affinity: "forward" },
          focus: { kind: "text", nodeId: "block-text-2", offset: 1, affinity: "forward" },
        }],
        primaryIndex: 0,
      },
    });
    const marked = editor.dispatch({ type: "mark.toggle", mark: { type: "strong" } });
    expect(marked.ok).toBe(true);
    if (marked.ok) expect(marked.change?.applied.some((operation) => operation.path === "")).toBe(false);
    editor.dispatch({ type: "selection.set", selection: collapsed("block-text-2", 1) });
    const split = editor.dispatch({ type: "block.split" });
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    expect(split.change?.applied.some((operation) => operation.path === "")).toBe(false);
    expect(split.change?.applied.some((operation) => operation.path === "/content")).toBe(false);
    expect(split.change?.applied.some((operation) => operation.op === "add")).toBe(true);
  });

  it("adopts topology after split and join instead of walking every node", () => {
    const document = createJSONDocument(createRichTextBlockFixture(10_000, { text: "xy" }));
    const editor = createRichTextEditor({
      document,
      selection: collapsed("block-text-5000", 1),
    });
    const instrument = createRichTextInstrument();
    const split = runWithRichTextInstrument(instrument, () => editor.dispatch({ type: "block.split" }));
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    const rightId = editor.snapshot.selection.ranges[0]?.focus.nodeId;
    expect(rightId).toBeDefined();
    expect(editor.topology.locate("block-text-5000")?.path).toEqual([5000, 0]);
    expect(editor.topology.locate(rightId!)?.node).toMatchObject({ type: "text", text: "y" });
    expect(editor.topology.locate("block-text-0")?.path).toEqual([0, 0]);
    expect(editor.topology.locate("block-text-9999")?.path).toEqual([10_000, 0]);
    expect(instrument.snapshot().topologyCreates).toBe(0);
    expect(instrument.snapshot().topologyAdopts).toBe(1);
    expect(instrument.snapshot().topologyVisits).toBeLessThan(32);

    instrument.reset();
    const joined = runWithRichTextInstrument(instrument, () => editor.dispatch({
      type: "block.join",
      direction: "backward",
    }));
    expect(joined.ok).toBe(true);
    expect(editor.topology.locate("block-text-5000")?.node).toMatchObject({ type: "text", text: "xy" });
    expect(editor.topology.locate("block-text-9999")?.path).toEqual([9999, 0]);
    expect(editor.topology.locate(rightId!)).toBeNull();
    const joinedInterval = editor.topology.interval(
      { kind: "text", nodeId: "block-text-0", offset: 0, affinity: "forward" },
      { kind: "text", nodeId: "block-text-9999", offset: 1, affinity: "forward" },
    );
    expect(joinedInterval.some((target) => target.nodeId === rightId)).toBe(false);
    expect(instrument.snapshot().topologyCreates).toBe(0);
    expect(instrument.snapshot().topologyAdopts).toBe(1);
    expect(instrument.snapshot().topologyVisits).toBeLessThan(32);
  });

  it.each([1_000, 10_000])("splits a block in a %s-block document with sibling add/remove, not a content replace", (size) => {
    const document = createJSONDocument(createRichTextBlockFixture(size));
    const editor = createRichTextEditor({
      document,
      selection: collapsed(`block-text-${Math.floor(size / 2)}`, 1),
    });
    const split = editor.dispatch({ type: "block.split" });
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    expect(split.change?.applied.some((operation) => operation.path === "" || operation.path === "/content")).toBe(false);
    expect(split.change?.applied.some((operation) => operation.op === "add")).toBe(true);
    const joined = editor.dispatch({ type: "block.join", direction: "backward" });
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    expect(joined.change?.applied.some((operation) => operation.path === "" || operation.path === "/content")).toBe(false);
  });

  it.each([1_000, 10_000])("inserts and deletes one text leaf in a %s-block document without a root replace or full walk", (size) => {
    const document = createJSONDocument(createRichTextBlockFixture(size));
    const editor = createRichTextEditor({
      document,
      selection: collapsed(`block-text-${Math.floor(size / 2)}`, 1),
    });
    const instrument = createRichTextInstrument();
    const inserted = runWithRichTextInstrument(instrument, () => editor.dispatch({ type: "text.insert", text: "y" }));
    expect(inserted.ok).toBe(true);
    if (!inserted.ok) return;
    expect(inserted.change?.applied).toEqual([
      { op: "replace", path: `/content/${Math.floor(size / 2)}/content/0/text`, value: "xy" },
    ]);
    expect(instrument.snapshot().visitedNodes).toBeLessThan(32);
    expect(instrument.snapshot().fullValidations).toBe(0);
    expect(instrument.snapshot().incrementalValidations).toBeGreaterThan(0);
    expect(instrument.snapshot().contentCopies).toBe(0);
    expect(textAt(document.value as RichTextDocument, Math.floor(size / 2))).toBe("xy");

    instrument.reset();
    const deleted = runWithRichTextInstrument(instrument, () => editor.dispatch({
      type: "text.delete",
      direction: "backward",
      unit: "character",
    }));
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) return;
    expect(deleted.change?.applied).toEqual([
      { op: "replace", path: `/content/${Math.floor(size / 2)}/content/0/text`, value: "x" },
    ]);
    expect(instrument.snapshot().visitedNodes).toBeLessThan(32);
    expect(instrument.snapshot().fullValidations).toBe(0);
    expect(instrument.snapshot().contentCopies).toBe(0);
  });

  it("undoes a local text insert with a leaf inverse, not a root replace", () => {
    const inner = createJSONDocument(createRichTextBlockFixture(256));
    const committed: string[][] = [];
    const document = {
      get value() { return inner.value; },
      at: inner.at.bind(inner),
      query: inner.query.bind(inner),
      validatePatch: inner.validatePatch.bind(inner),
      subscribe: inner.subscribe.bind(inner),
      commit(operations: Parameters<typeof inner.commit>[0], options?: Parameters<typeof inner.commit>[1]) {
        committed.push(operations.map((operation) => operation.path));
        return inner.commit(operations, options);
      },
    };
    const editor = createRichTextEditor({
      document,
      selection: collapsed("block-text-80", 1),
    });
    expect(editor.dispatch({ type: "text.insert", text: "Q" }).ok).toBe(true);
    expect(committed.at(-1)).toEqual(["/content/80/content/0/text"]);
    expect(editor.undo().ok).toBe(true);
    expect(committed.at(-1)).toEqual(["/content/80/content/0/text"]);
    expect(committed.every((paths) => paths.every((path) => path !== ""))).toBe(true);
  });

  it("keeps selection mapping and history after a local text insert", () => {
    const initial = createRichTextBlockFixture(8);
    const document = createJSONDocument(initial);
    const selection = collapsed("block-text-3", 1);
    const editor = createRichTextEditor({ document, selection });
    expect(editor.dispatch({ type: "text.insert", text: "Q" }).ok).toBe(true);
    expect(editor.snapshot.selection).toEqual(collapsed("block-text-3", 2));
    expect(editor.undo().ok).toBe(true);
    expect(document.value).toEqual(initial);
    expect(editor.snapshot.selection).toEqual(selection);
    expect(editor.redo().ok).toBe(true);
    expect(textAt(document.value as RichTextDocument, 3)).toBe("xQ");
  });
});

function collapsed(nodeId: string, offset: number) {
  const point = { kind: "text" as const, nodeId, offset, affinity: "forward" as const };
  return { kind: "range" as const, ranges: [{ anchor: point, focus: point }], primaryIndex: 0 };
}

function textAt(document: RichTextDocument, index: number): string | undefined {
  const block = document.content[index];
  if (block === undefined || !("content" in block) || !Array.isArray(block.content)) return undefined;
  const text = block.content[0];
  return text && "text" in text && typeof text.text === "string" ? text.text : undefined;
}
