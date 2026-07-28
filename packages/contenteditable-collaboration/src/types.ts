import type { Pointer } from "@interactive-os/json-document";
import type {
  ChangeId,
  CollaborationTextRuntime,
  CollaborationTextSelection,
} from "@interactive-os/json-document-collaboration/text";

export interface CollaborationTextDOMObservation {
  readonly value: string;
  readonly selection: CollaborationTextSelection | null;
}

/**
 * The DOM projection for one collaborative string field.
 *
 * Implementations may render wrappers, but observed and restored offsets must
 * use JavaScript/DOM UTF-16 offsets.
 */
export interface CollaborationTextDOM {
  observe(root: HTMLElement): CollaborationTextDOMObservation;
  render(root: HTMLElement, value: string): void;
  restoreSelection(
    root: HTMLElement,
    selection: CollaborationTextSelection,
  ): boolean;
}

export interface CollaborationContentEditableOptions {
  readonly runtime: CollaborationTextRuntime;
  readonly pointer: Pointer;
  readonly root: HTMLElement;
  readonly dom?: CollaborationTextDOM;
  readonly onResult?: (
    result: CollaborationContentEditableResult,
  ) => void;
}

export type CollaborationContentEditableResult =
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
      readonly projectionChanged: boolean;
      readonly selection: CollaborationTextSelection | null;
    }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
    };

export interface CollaborationContentEditableAdapter {
  bind(): () => void;
  handle(event: Event): CollaborationContentEditableResult;
  cancel(): CollaborationContentEditableResult;
  reset(): void;
}
