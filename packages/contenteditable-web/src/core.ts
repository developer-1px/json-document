import {
  replaceTextSurfaceSelection,
  syncTextSurfaceMutation,
  type JSONDocument,
  type JSONPatchOperation,
  type Pointer,
  type SelectionSnap,
  type TextSurface,
  type TextSurfaceFragment,
} from "@interactive-os/json-document";
import {
  isTextSurfaceFragment,
  selectedTextSurfaceFragment,
} from "./fragment.js";

export type TextSurfaceResolver =
  | TextSurface
  | ((textPath: Pointer) => TextSurface | null);

export interface ContentEditableTextPoint {
  path: Pointer;
  offset: number;
}

export interface ContentEditableObservationReader {
  point?(): ContentEditableTextPoint | null;
  text(path: Pointer): string | null;
  selection(): SelectionSnap | null;
}

export interface ContentEditableFlushOptions {
  label?: string;
  mergeKey?: string;
}

export type ContentEditableHistoryCommand = "undo" | "redo";

export type ContentEditableCommand =
  | {
      type: "begin-native-input";
      point: ContentEditableTextPoint | null;
    }
  | {
      type: "commit-native-input";
      point: ContentEditableTextPoint | null;
    }
  | {
      type: "begin-composition";
      point: ContentEditableTextPoint | null;
    }
  | {
      type: "commit-composition";
      point: ContentEditableTextPoint | null;
    }
  | {
      type: "sync-selection";
      selection: SelectionSnap | null;
    }
  | {
      type: "flush";
      options?: ContentEditableFlushOptions;
    }
  | {
      type: "copy";
    }
  | {
      type: "cut";
    }
  | {
      type: "paste";
      payload: TextSurfaceFragment | string | null;
      selection?: SelectionSnap | null;
    }
  | {
      type: "history";
      command: ContentEditableHistoryCommand;
    };

export type ContentEditableCoreResult<T> =
  | {
      ok: true;
      kind: "no-change" | "selection" | "text" | "history";
      patch: ReadonlyArray<JSONPatchOperation>;
      selection: SelectionSnap | null;
      value: T;
    }
  | {
      ok: true;
      kind: "copy" | "cut";
      patch: ReadonlyArray<JSONPatchOperation>;
      selection: SelectionSnap | null;
      payload: TextSurfaceFragment;
      value: T;
    }
  | ContentEditableError;

export type ContentEditableErrorCode =
  | "clipboard_unavailable"
  | "commit_failed"
  | "empty_selection"
  | "invalid_payload"
  | "missing_text_path";

export interface ContentEditableError {
  ok: false;
  code: ContentEditableErrorCode;
  reason: string;
}

export interface ContentEditableCoreOptions<T> {
  document: JSONDocument<T>;
  surface: TextSurfaceResolver;
}

export interface ContentEditableCore<T> {
  handle(
    command: ContentEditableCommand,
    reader: ContentEditableObservationReader,
  ): ContentEditableCoreResult<T>;
  reset(): void;
}

type NativeInputLease = {
  path: Pointer;
  phase: "native" | "composing" | "pending-commit";
};

export function createContentEditableCore<T>({
  document,
  surface,
}: ContentEditableCoreOptions<T>): ContentEditableCore<T> {
  let lease: NativeInputLease | null = null;

  const beginLease = (
    point: ContentEditableTextPoint | null,
    phase: NativeInputLease["phase"] = "native",
  ): NativeInputLease | null => {
    if (point === null) return lease;
    if (readDocumentString(document, point.path) === null) return lease;
    lease = { path: point.path, phase };
    return lease;
  };

  const flush = (
    reader: ContentEditableObservationReader,
    options: ContentEditableFlushOptions = {},
  ): ContentEditableCoreResult<T> => {
    const path = lease?.path ?? reader.point?.()?.path ?? null;
    if (path === null) {
      return syncSelection(reader.selection());
    }

    const previousText = readDocumentString(document, path);
    const textSurface = resolveSurface(surface, path);
    const nextText = reader.text(path);
    if (previousText === null || textSurface === null || nextText === null) {
      return {
        ok: false,
        code: "missing_text_path",
        reason: `No text surface found for ${path}.`,
      };
    }

    const selectionAfter =
      reader.selection() ??
      document.selection?.snapshot() ??
      null;

    const planned = syncTextSurfaceMutation(
      document.value,
      textSurface,
      previousText,
      nextText,
    );
    if (!planned.ok) {
      return {
        ok: false,
        code: "invalid_payload",
        reason: planned.reason,
      };
    }

    if (planned.patch.length === 0) {
      if (selectionAfter !== null) document.selection?.restore(selectionAfter);
      lease = null;
      return {
        ok: true,
        kind: "selection",
        patch: [],
        selection: selectionAfter,
        value: document.value,
      };
    }

    const commit = document.commit(planned.patch, {
      label: options.label ?? "contenteditable text",
      origin: "contenteditable",
      ...(options.mergeKey === undefined ? {} : { mergeKey: options.mergeKey }),
      ...(selectionAfter === null ? {} : { selectionAfter }),
    });
    if (!commit.ok) {
      return {
        ok: false,
        code: "commit_failed",
        reason: commit.reason ?? commit.code,
      };
    }
    lease = null;
    return {
      ok: true,
      kind: "text",
      patch: planned.patch,
      selection: selectionAfter,
      value: document.value,
    };
  };

  const syncSelection = (selection: SelectionSnap | null): ContentEditableCoreResult<T> => {
    if (selection !== null) document.selection?.restore(selection);
    return {
      ok: true,
      kind: selection === null ? "no-change" : "selection",
      patch: [],
      selection,
      value: document.value,
    };
  };

  const copy = (reader: ContentEditableObservationReader): ContentEditableCoreResult<T> => {
    const flushed = flush(reader, { label: "copy selection" });
    if (!flushed.ok) return flushed;
    const selection = document.selection?.snapshot() ?? null;
    const textSurface = surfaceFromSelection(surface, selection);
    if (selection === null || textSurface === null) {
      return emptySelectionError("No text surface selection was copied.");
    }

    const fragment = selectedTextSurfaceFragment(document, selection, textSurface);
    if (fragment === null) {
      return emptySelectionError("No text or atom range is selected.");
    }

    document.clipboard.write(fragment, { trustedPayload: true });
    return {
      ok: true,
      kind: "copy",
      patch: [],
      selection,
      payload: fragment,
      value: document.value,
    };
  };

  const cut = (reader: ContentEditableObservationReader): ContentEditableCoreResult<T> => {
    const copyResult = copy(reader);
    if (!copyResult.ok) return copyResult;
    if (copyResult.kind !== "copy") return noChange(document);
    return replaceSelection("", reader, undefined, "cut text", "cut", copyResult.payload);
  };

  const pasteFragment = (
    fragment: TextSurfaceFragment,
    reader: ContentEditableObservationReader,
    selection?: SelectionSnap | null,
  ): ContentEditableCoreResult<T> =>
    replaceSelection(fragment, reader, selection, "paste text");

  const pasteText = (
    text: string,
    reader: ContentEditableObservationReader,
    selection?: SelectionSnap | null,
  ): ContentEditableCoreResult<T> =>
    replaceSelection(text, reader, selection, "paste text");

  const paste = (
    payload: TextSurfaceFragment | string | null,
    reader: ContentEditableObservationReader,
    selection?: SelectionSnap | null,
  ): ContentEditableCoreResult<T> => {
    if (typeof payload === "string") return pasteText(payload, reader, selection);
    if (payload !== null) return pasteFragment(payload, reader, selection);

    const fragment = readDocumentClipboardFragment(document);
    if (fragment !== null) return pasteFragment(fragment, reader, selection);
    return {
      ok: false,
      code: "clipboard_unavailable",
      reason: "No paste payload was available.",
    };
  };

  const handle = (
    command: ContentEditableCommand,
    reader: ContentEditableObservationReader,
  ): ContentEditableCoreResult<T> => {
    if (command.type === "begin-native-input") {
      beginLease(command.point, "native");
      return noChange(document);
    }
    if (command.type === "commit-native-input") {
      beginLease(
        command.point,
        lease?.phase === "pending-commit" ? "pending-commit" : "native",
      );
      return flush(reader, {
        label: "native input",
        ...(lease === null ? {} : { mergeKey: `native:${lease.path}` }),
      });
    }
    if (command.type === "begin-composition") {
      beginLease(command.point, "composing");
      return noChange(document);
    }
    if (command.type === "commit-composition") {
      if (lease !== null) lease = { ...lease, phase: "pending-commit" };
      return flush(reader, { label: "composition commit" });
    }
    if (command.type === "sync-selection") {
      return syncSelection(command.selection);
    }
    if (command.type === "flush") {
      return flush(reader, command.options);
    }
    if (command.type === "copy") {
      return copy(reader);
    }
    if (command.type === "cut") {
      return cut(reader);
    }
    if (command.type === "paste") {
      return paste(command.payload, reader, command.selection);
    }
    if (command.type === "history") {
      const result = command.command === "undo" ? document.undo() : document.redo();
      return result.ok
        ? {
            ok: true,
            kind: "history",
            patch: [],
            selection: document.selection?.snapshot() ?? null,
            value: document.value,
          }
        : { ok: false, code: "commit_failed", reason: result.reason ?? result.code };
    }
    return noChange(document);
  };

  function replaceSelection(
    replacement: string | TextSurfaceFragment,
    reader: ContentEditableObservationReader,
    selection: SelectionSnap | null | undefined,
    label: string,
    kind: "cut" | "text" = "text",
    payload?: TextSurfaceFragment,
  ): ContentEditableCoreResult<T> {
    const flushed = flush(reader, { label: "flush before text surface replace" });
    if (!flushed.ok) return flushed;
    const targetSelection =
      selection === undefined
        ? document.selection?.snapshot() ?? null
        : selection;
    if (targetSelection !== null) document.selection?.restore(targetSelection);
    const textSurface = surfaceFromSelection(surface, targetSelection);
    if (targetSelection === null || textSurface === null) {
      return emptySelectionError("No text surface selection is available.");
    }
    const planned = replaceTextSurfaceSelection(
      targetSelection,
      document.value,
      textSurface,
      replacement,
    );
    if (!planned.ok) {
      return { ok: false, code: "invalid_payload", reason: planned.reason };
    }
    const commit = document.commit(planned.patch, {
      label,
      origin: "contenteditable",
      selectionAfter: planned.selectionAfter,
    });
    if (!commit.ok) {
      return { ok: false, code: "commit_failed", reason: commit.reason ?? commit.code };
    }
    return kind === "cut" && payload !== undefined
      ? {
          ok: true,
          kind: "cut",
          patch: planned.patch,
          selection: document.selection?.snapshot() ?? null,
          payload,
          value: document.value,
        }
      : {
          ok: true,
          kind: "text",
          patch: planned.patch,
          selection: document.selection?.snapshot() ?? null,
          value: document.value,
        };
  }

  return {
    handle,
    reset() {
      lease = null;
    },
  };
}

function resolveSurface(
  resolver: TextSurfaceResolver,
  textPath: Pointer,
): TextSurface | null {
  return typeof resolver === "function" ? resolver(textPath) : resolver;
}

function surfaceFromSelection(
  resolver: TextSurfaceResolver,
  selection: SelectionSnap | null,
): TextSurface | null {
  const path = textPathFromSelection(selection);
  return path === null ? null : resolveSurface(resolver, path);
}

function textPathFromSelection(selection: SelectionSnap | null): Pointer | null {
  const range = selection?.selectionRanges[selection.primaryIndex];
  if (
    range === undefined ||
    typeof range.anchor === "string" ||
    typeof range.focus === "string" ||
    range.anchor.path !== range.focus.path
  ) {
    return null;
  }
  return range.anchor.path;
}

function readDocumentString<T>(document: JSONDocument<T>, path: Pointer): string | null {
  const result = document.at(path);
  return result.ok && typeof result.value === "string" ? result.value : null;
}

function readDocumentClipboardFragment<T>(
  document: JSONDocument<T>,
): TextSurfaceFragment | null {
  const result = document.clipboard.read();
  return result.ok && isTextSurfaceFragment(result.payload) ? result.payload : null;
}

function noChange<T>(document: JSONDocument<T>): ContentEditableCoreResult<T> {
  return {
    ok: true,
    kind: "no-change",
    patch: [],
    selection: document.selection?.snapshot() ?? null,
    value: document.value,
  };
}

function emptySelectionError(reason: string): ContentEditableError {
  return { ok: false, code: "empty_selection", reason };
}
