import type { JSONDocument, Pointer } from "@interactive-os/json-document";
import type { EditingResult, TextEditor, TextSelection } from "@interactive-os/json-document-editing";
import type { TextProjection } from "./dom/text-projection.js";
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
  /** Source intervals with an atomic visual representation, shared with selection painting. */
  getTextProjections?(root: HTMLElement): ReadonlyArray<TextProjection>;
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

export type ContentEditableFailure = { readonly ok: false; readonly code: string; readonly reason: string };

/** Text commit port for a shared string: capture a basis before native input, plan from the DOM observation, commit the plan. */
export interface ContentEditableTextPort<Capture = unknown, Plan = unknown> {
  capture(pointer: Pointer): { readonly ok: true; readonly capture: Capture } | ContentEditableFailure;
  plan(capture: Capture, observation: { readonly value: string; readonly selection?: TextSelection }): { readonly ok: true; readonly plan: Plan } | ContentEditableFailure;
  commit(plan: Plan): { readonly ok: true; readonly changeId: unknown; readonly didChangeDocument: boolean; readonly selection: TextSelection | null } | ContentEditableFailure;
}

export interface ContentEditableBindingOptions {
  readonly document: JSONDocument;
  readonly pointer: Pointer;
  readonly root: HTMLElement;
  readonly dom?: TextDOMAdapter;
  /** Owns observation commits for a shared string (collaboration text runtime): concurrent edits merge instead of failing stale. */
  readonly text?: ContentEditableTextPort;
  /** Opt in to virtual selection/caret painting; native input and selection remain authoritative. */
  readonly selectionRendering?: "native" | "virtual";
  /** Optional canonical source editor; replaces direct commits with selection-restoring Editing transactions. */
  readonly editor?: TextEditor;
  /** Syntax-owned Enter command; paste and native composition text keep their original content. */
  readonly insertBreak?: (editor: TextEditor) => EditingResult<TextSelection>;
  /** Syntax-owned Tab action; null leaves native focus navigation available. */
  readonly indent?: (editor: TextEditor, direction: "indent" | "outdent") => EditingResult<TextSelection> | null;
}

export type ContentEditableBindingResult =
  | { readonly ok: true; readonly kind: "no-change" | "lease-started" | "rendered" | "cancelled" }
  | { readonly ok: true; readonly kind: "committed"; readonly changeId?: unknown; readonly didChangeDocument?: boolean; readonly selection?: TextSelection | null }
  | ContentEditableFailure;

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
