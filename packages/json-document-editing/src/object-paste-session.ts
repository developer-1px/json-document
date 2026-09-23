import type { EditingResult } from "./session.js";
import type { ObjectClipboard, ObjectEditor, ObjectPastePlacement, ObjectSelection } from "./object.js";
import { createEditingPreparationQueue, type EditingPreparation } from "./preparation-queue.js";

export type ObjectPastePreparation =
  | { readonly ok: true; readonly clipboard: ObjectClipboard }
  | { readonly ok: false; readonly code: string; readonly reason?: string };

export interface ObjectPasteSession {
  readonly pending: boolean;
  enqueue(prepare: () => ObjectPastePreparation | Promise<ObjectPastePreparation>, cancelPreparation?: () => void): Promise<EditingResult<ObjectSelection>>;
  /** Cancels queued work and releases subscriptions. The session can be reused. */
  cancel(): void;
}

/** Ordered, atomic paste adoption. External document/selection changes invalidate pending work. */
export function createObjectPasteSession(editor: ObjectEditor, options: {
  readonly placement?: ObjectPastePlacement;
  readonly onResult?: (result: EditingResult<ObjectSelection>) => void;
  readonly onPendingChange?: (pending: boolean) => void;
} = {}): ObjectPasteSession {
  let release: (() => void) | undefined;
  let applying = false;
  const queue = createEditingPreparationQueue<ObjectClipboard, EditingResult<ObjectSelection>>({
    cancelCode: "clipboard.cancelled",
    errorCode: "clipboard.invalid",
    apply(clipboard) {
      applying = true;
      try { return editor.dispatch({ type: "clipboard.paste", clipboard, ...(options.placement ? { placement: options.placement } : {}) }); }
      finally { applying = false; }
    },
    onPendingChange(pending) {
      if (!pending) { release?.(); release = undefined; }
      options.onPendingChange?.(pending);
    },
    onResult(result) {
      try { options.onResult?.(result); }
      finally {
        if (result.ok && (editor.snapshot.value !== result.snapshot.value || editor.snapshot.selection !== result.snapshot.selection)) queue.cancel();
      }
    },
  });
  const prepared = (result: ObjectPastePreparation): EditingPreparation<ObjectClipboard> => result.ok ? { ok: true, value: result.clipboard } : result;
  return {
    get pending() { return queue.isPending; },
    cancel: queue.cancel,
    enqueue(prepare, cancelPreparation) {
      if (!release) {
        let base = editor.snapshot;
        release = editor.subscribe((next) => {
          if (!applying && (base.value !== next.value || base.selection !== next.selection)) queue.cancel();
          base = next;
        });
      }
      return queue.enqueue(() => {
        const result = prepare();
        return "ok" in result ? prepared(result) : Promise.resolve(result).then(prepared);
      }, cancelPreparation);
    },
  };
}
