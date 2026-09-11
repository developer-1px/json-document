import type { JSONDocument, Pointer } from "@interactive-os/json-document";
import type { TextEditor, TextSelection } from "@interactive-os/json-document-editing";
export type { TextSelection } from "@interactive-os/json-document-editing";

export interface DOMObservation {
  readonly value: string;
  readonly selection: TextSelection | null;
}

export interface TextDOMSelectionOptions {
  readonly affinity?: (offset: number) => "backward" | "forward";
}

export interface TextDOMAdapter {
  observe(root: HTMLElement): DOMObservation;
  render(root: HTMLElement, value: string, selection?: TextSelection | null): void;
  restoreSelection(root: HTMLElement, selection: TextSelection, options?: TextDOMSelectionOptions): boolean;
  /** Resolve a source deletion range where native DOM deletion cannot preserve the projection. */
  resolveDeletionSelection?(root: HTMLElement, selection: TextSelection, direction: "backward" | "forward"): TextSelection | null;
  /** Resolve a source-coordinate step across projected DOM boundaries; null keeps native navigation. */
  resolveHorizontalSelection?(root: HTMLElement, selection: TextSelection, direction: "backward" | "forward", extend: boolean): TextSelection | null;
}

export interface ContentEditableBindingOptions {
  readonly document: JSONDocument;
  readonly pointer: Pointer;
  readonly root: HTMLElement;
  readonly dom?: TextDOMAdapter;
  /** Optional canonical source editor; replaces direct commits with selection-restoring Editing transactions. */
  readonly editor?: TextEditor;
}

export type ContentEditableBindingResult =
  | { readonly ok: true; readonly kind: "no-change" | "lease-started" | "rendered" | "cancelled" | "committed" }
  | { readonly ok: false; readonly code: string; readonly reason: string };

export interface ContentEditableBinding {
  bind(): () => void;
  handle(event: Event): ContentEditableBindingResult;
  cancel(): ContentEditableBindingResult;
  reset(): void;
}

export interface ContentEditableProps {
  readonly document: JSONDocument;
  readonly pointer: Pointer;
  readonly className?: string;
  readonly "aria-label"?: string;
}
