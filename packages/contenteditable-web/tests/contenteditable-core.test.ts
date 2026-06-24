// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import * as z from "zod";

import { createJSONDocument, type SelectionSnap, type TextSurface } from "@interactive-os/json-document";
import {
  createContentEditableCore,
  type ContentEditableObservationReader,
  type ContentEditableTextPoint,
} from "../src/core.js";
import { JSON_ATOM_REPLACEMENT } from "../src/constants.js";

const AtomSchema = z.object({
  type: z.literal("mention"),
  label: z.string(),
  offset: z.number().int().nonnegative(),
});

const MarkSchema = z.object({
  type: z.literal("bold"),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

const Schema = z.object({
  body: z.string(),
  atoms: z.record(z.string(), AtomSchema),
  marks: z.record(z.string(), MarkSchema),
});

const surface: TextSurface = {
  textPath: "/body",
  atomsPath: "/atoms",
  rangesPath: "/marks",
};

function createDoc(value: z.output<typeof Schema> = {
  body: `Plain text ${JSON_ATOM_REPLACEMENT}`,
  atoms: {
    ada: { type: "mention" as const, label: "@Ada", offset: 11 },
  },
  marks: {},
}) {
  return createJSONDocument(Schema, value, {
    history: 20,
    selection: true,
    trustedInitial: true,
  });
}

function selection(anchor: number, focus: number): SelectionSnap {
  const anchorPoint = { path: "/body", offset: anchor };
  const focusPoint = { path: "/body", offset: focus };
  return {
    selectedPointers: ["/body"],
    selectionRanges: [{ anchor: anchorPoint, focus: focusPoint }],
    primaryIndex: 0,
    anchor: anchorPoint,
    focus: focusPoint,
  };
}

function createTestAdapter(initialText: string, initialSelection: SelectionSnap | null = null) {
  let text = initialText;
  let currentSelection = initialSelection;
  const currentPoint: ContentEditableTextPoint = { path: "/body", offset: 0 };
  const reader: ContentEditableObservationReader = {
    point: () => currentPoint,
    text: (path) => path === "/body" ? text : null,
    selection: () => currentSelection,
  };
  return {
    reader,
    setText(next: string) {
      text = next;
    },
    setSelection(next: SelectionSnap | null) {
      currentSelection = next;
    },
    setOffset(offset: number) {
      currentPoint.offset = offset;
    },
    point() {
      return currentPoint;
    },
  };
}

describe("contenteditable headless core", () => {
  test("keeps the core source free of DOM APIs", () => {
    for (const path of ["../src/core.ts", "../src/fragment.ts"]) {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");

      expect(source).not.toMatch(
        /\b(?:HTMLElement|ClipboardEvent|KeyboardEvent|InputEvent|CompositionEvent|Range|Node|window|ownerDocument|querySelector)\b/,
      );
    }
  });

  test("commits native input observations without DOM", () => {
    const doc = createDoc();
    const adapter = createTestAdapter(doc.value.body, selection(5, 5));
    const core = createContentEditableCore({ document: doc, surface });

    adapter.setOffset(5);
    core.handle({ type: "begin-native-input", point: adapter.point() }, adapter.reader);
    adapter.setText(`Plain! text ${JSON_ATOM_REPLACEMENT}`);
    adapter.setSelection(selection(6, 6));

    const result = core.handle({ type: "commit-native-input", point: adapter.point() }, adapter.reader);

    expect(result).toMatchObject({ ok: true, kind: "text" });
    expect(doc.value.body).toBe(`Plain! text ${JSON_ATOM_REPLACEMENT}`);
    expect(doc.value.atoms.ada?.offset).toBe(12);
    expect(doc.selection?.focus).toMatchObject({ path: "/body", offset: 6 });
  });

  test("keeps IME composition out of the document until compositionend", () => {
    const doc = createDoc({ body: "", atoms: {}, marks: {} });
    const adapter = createTestAdapter("", selection(0, 0));
    const core = createContentEditableCore({ document: doc, surface });

    core.handle({ type: "begin-composition", point: adapter.point() }, adapter.reader);
    adapter.setText("한");
    adapter.setSelection(selection(1, 1));

    expect(doc.value.body).toBe("");

    const result = core.handle({ type: "commit-composition", point: adapter.point() }, adapter.reader);

    expect(result).toMatchObject({ ok: true, kind: "text" });
    expect(doc.value.body).toBe("한");
    expect(doc.selection?.focus).toMatchObject({ path: "/body", offset: 1 });
  });

  test("copies, cuts, and pastes structured fragments without DOM", () => {
    const doc = createDoc({
      body: `Hi ${JSON_ATOM_REPLACEMENT}`,
      atoms: {
        ada: { type: "mention", label: "@Ada", offset: 3 },
      },
      marks: {
        bold: { type: "bold", start: 0, end: 2 },
      },
    });
    const selected = selection(0, 4);
    const adapter = createTestAdapter(doc.value.body, selected);
    const core = createContentEditableCore({ document: doc, surface });

    const copied = core.handle({ type: "copy" }, adapter.reader);

    expect(copied).toMatchObject({
      ok: true,
      kind: "copy",
      payload: {
        text: `Hi ${JSON_ATOM_REPLACEMENT}`,
        atoms: { ada: { offset: 3 } },
        ranges: { bold: { start: 0, end: 2 } },
      },
    });
    if (!copied.ok || copied.kind !== "copy") throw new Error("copy failed");

    const cut = core.handle({ type: "cut" }, adapter.reader);

    expect(cut).toMatchObject({ ok: true, kind: "cut" });
    expect(doc.value).toEqual({ body: "", atoms: {}, marks: {} });

    adapter.setText(doc.value.body);
    adapter.setSelection(selection(0, 0));

    const pasted = core.handle({ type: "paste", payload: copied.payload }, adapter.reader);

    expect(pasted).toMatchObject({ ok: true, kind: "text" });
    expect(doc.value).toEqual({
      body: `Hi ${JSON_ATOM_REPLACEMENT}`,
      atoms: {
        ada: { type: "mention", label: "@Ada", offset: 3 },
      },
      marks: {
        bold: { type: "bold", start: 0, end: 2 },
      },
    });
  });

  test("uses current selection for plain text paste without DOM", () => {
    const doc = createDoc({ body: "Plain text", atoms: {}, marks: {} });
    const adapter = createTestAdapter(doc.value.body, selection(0, 5));
    const core = createContentEditableCore({ document: doc, surface });

    const pasted = core.handle({ type: "paste", payload: "Rich" }, adapter.reader);

    expect(pasted).toMatchObject({ ok: true, kind: "text" });
    expect(doc.value.body).toBe("Rich text");
    expect(doc.selection?.focus).toMatchObject({ path: "/body", offset: 4 });
  });
});
