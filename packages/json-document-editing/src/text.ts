import type { JSONDocument, Pointer } from "@interactive-os/json-document";
import { createEditingSession, type EditingResult, type EditingSnapshot } from "./session.js";

/** Directional UTF-16 source offsets. */
export type TextSelection = { readonly anchor: number; readonly focus: number };
export interface TextEditor {
  readonly document: JSONDocument;
  readonly pointer: Pointer;
  readonly text: string;
  readonly snapshot: EditingSnapshot<TextSelection>;
  select(selection: TextSelection): EditingSnapshot<TextSelection>;
  replace(value: string, selection: TextSelection): EditingResult<TextSelection>;
  insert(text: string): EditingResult<TextSelection>;
  copy(): string;
  undo(): EditingResult<TextSelection>;
  redo(): EditingResult<TextSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<TextSelection>) => void): () => void;
}

/** A plain source-string editor. Syntax and platform input belong to its consumers. */
export function createTextEditor(document: JSONDocument, pointer: Pointer = ""): TextEditor {
  const read = (): string => {
    const value = document.at(pointer);
    if (!value.ok || typeof value.value !== "string") throw new TypeError("Text editor target must be a string");
    return value.value;
  };
  read();
  const session = createEditingSession<TextSelection>({
    document,
    selection: { anchor: 0, focus: 0 },
    reconcileSelection: (selection) => {
      const value = document.at(pointer);
      return clampTextSelection(value.ok && typeof value.value === "string" ? value.value : "", selection);
    },
  });
  const replace = (value: string, selection: TextSelection): EditingResult<TextSelection> => {
    const target = document.at(pointer);
    if (!target.ok || typeof target.value !== "string") return { ok: false, code: "text.target-unavailable" };
    if (typeof value !== "string") return { ok: false, code: "text.invalid-value" };
    const next = clampTextSelection(value, selection);
    if (value === target.value) return { ok: true, snapshot: select(next) };
    return session.apply({
      operations: [{ op: "replace", path: pointer, value }],
      selectionAfter: next,
      origin: "text.replace",
    });
  };
  const select = (selection: TextSelection): EditingSnapshot<TextSelection> => {
    const value = document.at(pointer);
    const next = clampTextSelection(value.ok && typeof value.value === "string" ? value.value : "", selection);
    const current = session.snapshot.selection;
    return current.anchor === next.anchor && current.focus === next.focus ? session.snapshot : session.select(next);
  };
  return {
    document, pointer,
    get text() { return read(); },
    get snapshot() { return session.snapshot; },
    select, replace,
    insert(text) {
      const target = document.at(pointer);
      if (!target.ok || typeof target.value !== "string") return { ok: false, code: "text.target-unavailable" };
      const value = target.value;
      const { anchor, focus } = session.snapshot.selection;
      const from = Math.min(anchor, focus);
      const to = Math.max(anchor, focus);
      return replace(value.slice(0, from) + text + value.slice(to), { anchor: from + text.length, focus: from + text.length });
    },
    copy() {
      const { anchor, focus } = session.snapshot.selection;
      return read().slice(Math.min(anchor, focus), Math.max(anchor, focus));
    },
    undo: () => session.undo(),
    redo: () => session.redo(),
    subscribe: (listener) => session.subscribe(listener),
  };
}

/** Clamp directional source selections without splitting a surrogate pair. */
export function clampTextSelection(value: string, selection: TextSelection): TextSelection {
  const clamp = (offset: number, backward: boolean): number => {
    const n = Number.isFinite(offset) ? Math.max(0, Math.min(value.length, Math.trunc(offset))) : 0;
    const high = value.charCodeAt(n - 1);
    const low = value.charCodeAt(n);
    return high >= 0xd800 && high <= 0xdbff && low >= 0xdc00 && low <= 0xdfff ? n + (backward ? -1 : 1) : n;
  };
  const anchor = clamp(selection.anchor, selection.anchor < selection.focus);
  return { anchor, focus: selection.anchor === selection.focus ? anchor : clamp(selection.focus, selection.focus < selection.anchor) };
}
