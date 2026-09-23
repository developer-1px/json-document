import { jsonEqual, type JSONAppliedChange, type JSONDocument } from "@interactive-os/json-document";

/** A one-shot change marker. The document retains no editor, history or UI callback. */
export function observeHistoryInvalidation(
  document: JSONDocument,
  pendingOwnChange?: JSONAppliedChange,
): { readonly changed: boolean } {
  const marker = { changed: false };
  const release = document.subscribe((change) => {
    // A reentrant commit may return before its queued notification is delivered.
    // Earlier queued changes precede this history entry; start after its own change.
    if (pendingOwnChange) {
      if (jsonEqual(change, pendingOwnChange)) pendingOwnChange = undefined;
      return;
    }
    marker.changed = true;
    release();
  });
  return marker;
}
