import type { Pointer } from "@interactive-os/json-document";
import type {
  ChangeId,
  TextRuntime,
  TextSelection,
} from "@interactive-os/json-document-collaboration/text";

export interface DOMObservation {
  readonly value: string;
  readonly selection: TextSelection | null;
}

/** @deprecated Use DOMObservation. */
export type CollaborationTextDOMObservation = DOMObservation;

/**
 * The DOM adapter for one collaborative string field.
 *
 * Implementations may render wrappers, but observed and restored offsets must
 * use JavaScript/DOM UTF-16 offsets.
 */
export interface TextDOMAdapter {
  observe(root: HTMLElement): DOMObservation;
  render(root: HTMLElement, value: string): void;
  restoreSelection(
    root: HTMLElement,
    selection: TextSelection,
  ): boolean;
}

/** @deprecated Use TextDOMAdapter. */
export type CollaborationTextDOM = TextDOMAdapter;

export interface ContentEditableOptions {
  readonly runtime: TextRuntime;
  readonly pointer: Pointer;
  readonly root: HTMLElement;
  readonly dom?: TextDOMAdapter;
  readonly onResult?: (
    result: ContentEditableResult,
  ) => void;
}

/** @deprecated Use ContentEditableOptions. */
export type CollaborationContentEditableOptions = ContentEditableOptions;

export type ContentEditableResult =
  | {
      readonly ok: true;
      readonly kind:
        | "no-change"
        | "lease-started"
        | "rendered"
        | "cancelled";
    }
  | {
      readonly ok: true;
      readonly kind: "committed";
      readonly changeId: ChangeId | null;
      readonly didChangeDocument: boolean;
      /** @deprecated Use didChangeDocument. */
      readonly projectionChanged: boolean;
      readonly selection: TextSelection | null;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };

/** @deprecated Use ContentEditableResult. */
export type CollaborationContentEditableResult = ContentEditableResult;

export interface ContentEditableAdapter {
  bind(): () => void;
  handle(event: Event): ContentEditableResult;
  cancel(): ContentEditableResult;
  reset(): void;
}

/** @deprecated Use ContentEditableAdapter. */
export type CollaborationContentEditableAdapter = ContentEditableAdapter;
