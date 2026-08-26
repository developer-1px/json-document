import type { Pointer } from "@interactive-os/json-document";
import type {
  ChangeId,
  TextRuntime,
  TextSelection,
} from "@interactive-os/json-document-collaboration/text";
import type { TextDOMAdapter } from "@interactive-os/json-document-contenteditable";

export type { DOMObservation, TextDOMAdapter } from "@interactive-os/json-document-contenteditable";

export interface ContentEditableOptions {
  readonly runtime: TextRuntime;
  readonly pointer: Pointer;
  readonly root: HTMLElement;
  readonly dom?: TextDOMAdapter;
  readonly onResult?: (
    result: ContentEditableResult,
  ) => void;
}

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
      readonly selection: TextSelection | null;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };

export interface ContentEditableAdapter {
  bind(): () => void;
  handle(event: Event): ContentEditableResult;
  cancel(): ContentEditableResult;
  reset(): void;
}
