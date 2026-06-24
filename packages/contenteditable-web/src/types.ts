import type {
  JSONDocument,
  JSONPatchOperation,
  Pointer,
  SelectionSnap,
  TextSurface,
  TextSurfaceFragment,
} from "@interactive-os/json-document";

export type TextSurfaceResolver =
  | TextSurface
  | ((textPath: Pointer) => TextSurface | null);

export interface ContentEditableAdapterOptions<T> {
  document: JSONDocument<T>;
  root: HTMLElement;
  surface: TextSurfaceResolver;
  atomAttribute?: string;
  textAttribute?: string;
  clipboardMime?: string;
}

export type ContentEditableUpdate =
  | {
      ok: true;
      kind: "no-change" | "selection" | "text";
      patch: ReadonlyArray<JSONPatchOperation>;
      selection: SelectionSnap | null;
    }
  | ContentEditableError;

export type ContentEditableClipboardResult<T> =
  | {
      ok: true;
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

export interface ContentEditableFlushOptions {
  label?: string;
  mergeKey?: string;
}

export interface ContentEditableAdapter<T> {
  bind(): () => void;
  handle(event: Event): ContentEditableUpdate;
  flush(options?: ContentEditableFlushOptions): ContentEditableUpdate;
  syncSelectionFromDOM(): SelectionSnap | null;
  restoreSelectionToDOM(selection?: SelectionSnap): boolean;
  copy(event?: ClipboardEvent): ContentEditableClipboardResult<T>;
  cut(event?: ClipboardEvent): ContentEditableClipboardResult<T>;
  paste(event?: ClipboardEvent): ContentEditableClipboardResult<T>;
  pasteText(text: string, selection?: SelectionSnap | null): ContentEditableClipboardResult<T>;
  pasteFragment(
    fragment: TextSurfaceFragment,
    selection?: SelectionSnap | null,
  ): ContentEditableClipboardResult<T>;
  reset(): void;
}
