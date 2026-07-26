import { describe, expect, test } from "vitest";
import * as z from "zod";

import {
  createJSONDocument,
  replaceTextSurfaceSelection,
  syncTextSurfaceMutation,
  textSurfaceFragment,
  type SelectionSnap,
  type TextSurface,
} from "@interactive-os/json-document/session";

const ATOM = "\uFFFC";

const AtomSchema = z.object({
  type: z.literal("mention"),
  label: z.string(),
  offset: z.number().int().nonnegative(),
});

const MarkSchema = z.object({
  type: z.union([z.literal("bold"), z.literal("underline")]),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

const RichTextSchema = z.object({
  body: z.string(),
  atoms: z.record(z.string(), AtomSchema),
  marks: z.record(z.string(), MarkSchema),
});

const surface: TextSurface = {
  textPath: "/body",
  atomsPath: "/atoms",
  rangesPath: "/marks",
};

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

describe("text surface primitives", () => {
  test("extracts selected text with clipped atoms and ranges", () => {
    const doc = createJSONDocument(
      RichTextSchema,
      {
        body: `Hello ${ATOM}world`,
        atoms: {
          ada: { type: "mention", label: "@Ada", offset: 6 },
        },
        marks: {
          bold: { type: "bold", start: 0, end: 5 },
          underline: { type: "underline", start: 6, end: 12 },
        },
      },
      { trustedInitial: true },
    );

    const result = textSurfaceFragment(selection(0, 7), doc.value, surface);

    expect(result).toMatchObject({
      ok: true,
      fragment: {
        text: `Hello ${ATOM}`,
        atoms: {
          ada: { label: "@Ada", offset: 6 },
        },
        ranges: {
          bold: { type: "bold", start: 0, end: 5 },
          underline: { type: "underline", start: 6, end: 7 },
        },
      },
    });
  });

  test("replaces a text selection and maps existing sidecars in one patch", () => {
    const doc = createJSONDocument(
      RichTextSchema,
      {
        body: "Hello world",
        atoms: {
          ada: { type: "mention", label: "@Ada", offset: 6 },
        },
        marks: {
          bold: { type: "bold", start: 0, end: 5 },
          underline: { type: "underline", start: 6, end: 11 },
        },
      },
      { history: 20, selection: true, trustedInitial: true },
    );

    const planned = replaceTextSurfaceSelection(selection(0, 5), doc.value, surface, "Hi");
    expect(planned).toMatchObject({
      ok: true,
      selectionAfter: {
        focus: { path: "/body", offset: 2 },
      },
    });
    if (!planned.ok) throw new Error(planned.reason);

    expect(doc.commit(planned.patch, { selectionAfter: planned.selectionAfter })).toEqual({ ok: true });

    expect(doc.value).toEqual({
      body: "Hi world",
      atoms: {
        ada: { type: "mention", label: "@Ada", offset: 3 },
      },
      marks: {
        bold: { type: "bold", start: 0, end: 2 },
        underline: { type: "underline", start: 3, end: 8 },
      },
    });
    expect(doc.selection?.focus).toMatchObject({ path: "/body", offset: 2 });
    expect(doc.undo()).toEqual({ ok: true });
    expect(doc.value.body).toBe("Hello world");
  });

  test("pastes structured fragments and suffixes sidecar id collisions", () => {
    const doc = createJSONDocument(
      RichTextSchema,
      {
        body: `${ATOM} Hello`,
        atoms: {
          ada: { type: "mention", label: "@Ada", offset: 0 },
        },
        marks: {
          bold: { type: "bold", start: 0, end: 1 },
        },
      },
      { trustedInitial: true },
    );

    const planned = replaceTextSurfaceSelection(selection(2, 7), doc.value, surface, {
      text: `${ATOM}Yo`,
      atoms: {
        ada: { type: "mention", label: "@Ada", offset: 0 },
      },
      ranges: {
        bold: { type: "bold", start: 0, end: 1 },
      },
    });
    if (!planned.ok) throw new Error(planned.reason);

    expect(doc.commit(planned.patch)).toEqual({ ok: true });
    expect(doc.value).toEqual({
      body: `${ATOM} ${ATOM}Yo`,
      atoms: {
        ada: { type: "mention", label: "@Ada", offset: 0 },
        "ada-2": { type: "mention", label: "@Ada", offset: 2 },
      },
      marks: {
        bold: { type: "bold", start: 0, end: 1 },
        "bold-2": { type: "bold", start: 2, end: 3 },
      },
    });
  });

  test("syncs a native text mutation into sidecar patches", () => {
    const doc = createJSONDocument(
      RichTextSchema,
      {
        body: "Hello brave world",
        atoms: {
          ada: { type: "mention", label: "@Ada", offset: 12 },
        },
        marks: {
          underline: { type: "underline", start: 12, end: 17 },
        },
      },
      { trustedInitial: true },
    );

    const planned = syncTextSurfaceMutation(doc.value, surface, "Hello brave world", "Hello world");
    if (!planned.ok) throw new Error(planned.reason);

    expect(doc.commit(planned.patch)).toEqual({ ok: true });
    expect(doc.value).toEqual({
      body: "Hello world",
      atoms: {
        ada: { type: "mention", label: "@Ada", offset: 6 },
      },
      marks: {
        underline: { type: "underline", start: 6, end: 11 },
      },
    });
  });

  test("leaves schema validation to normal document commit", () => {
    const StrictSchema = RichTextSchema.extend({
      body: z.string().min(1),
    });
    const doc = createJSONDocument(
      StrictSchema,
      { body: "A", atoms: {}, marks: {} },
      { trustedInitial: true },
    );

    const planned = replaceTextSurfaceSelection(selection(0, 1), doc.value, surface, "");
    if (!planned.ok) throw new Error(planned.reason);

    expect(doc.commit(planned.patch)).toMatchObject({
      ok: false,
      code: "schema_violation",
    });
    expect(doc.value.body).toBe("A");
  });
});
