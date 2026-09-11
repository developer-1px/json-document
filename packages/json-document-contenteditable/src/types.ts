import type { JSONDocument, Pointer } from "@interactive-os/json-document";
import type { EditingResult, TextEditor, TextSelection } from "@interactive-os/json-document-editing";
export type { TextSelection } from "@interactive-os/json-document-editing";

export interface DOMObservation {
  readonly value: string;
  readonly selection: TextSelection | null;
}

export interface TextDOMSelectionOptions {
  /** Undefined preserves an equivalent live DOM endpoint; explicit affinity chooses a side. */
  readonly affinity?: (offset: number) => "backward" | "forward" | undefined;
}

export interface TextDOMAdapter {
  observe(root: HTMLElement): DOMObservation;
  render(root: HTMLElement, value: string, selection?: TextSelection | null): void;
  restoreSelection(root: HTMLElement, selection: TextSelection, options?: TextDOMSelectionOptions): boolean;
  /** Resolve one visual line while retaining the horizontal goal; null keeps native navigation. */
  resolveVerticalSelection?(root: HTMLElement, selection: TextSelection, direction: "backward" | "forward", extend: boolean): TextSelection | null;
  /** Reset the horizontal goal after another input, pointer placement, or blur. */
  resetNavigation?(root: HTMLElement): void;
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
  /** Syntax-owned Enter command; paste and native composition text keep their original content. */
  readonly insertBreak?: (editor: TextEditor) => EditingResult<TextSelection>;
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
