import type {
  JSONDocument,
  SelectionSnap,
  TextSurfaceFragment,
} from "@interactive-os/json-document/session";
import type {
  ContentEditableResult,
  TextSurfaceResolver,
} from "./core.js";

export type {
  ContentEditableError,
  ContentEditableResult,
  TextSurfaceResolver,
} from "./core.js";

export interface ContentEditableAdapterOptions<T> {
  document: JSONDocument<T>;
  root: HTMLElement;
  surface: TextSurfaceResolver;
  atomAttribute?: string;
  textAttribute?: string;
  clipboardMime?: string;
}

export interface ContentEditableAdapter<T> {
  bind(): () => void;
  handle(event: Event): ContentEditableResult<T>;
  flush(): ContentEditableResult<T>;
  syncSelectionFromDOM(): SelectionSnap | null;
  restoreSelectionToDOM(selection?: SelectionSnap): boolean;
  copy(event?: ClipboardEvent): ContentEditableResult<T>;
  cut(event?: ClipboardEvent): ContentEditableResult<T>;
  paste(event?: ClipboardEvent): ContentEditableResult<T>;
  pasteText(text: string, selection?: SelectionSnap | null): ContentEditableResult<T>;
  pasteFragment(
    fragment: TextSurfaceFragment,
    selection?: SelectionSnap | null,
  ): ContentEditableResult<T>;
  reset(): void;
}
