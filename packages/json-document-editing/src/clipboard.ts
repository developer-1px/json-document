export interface EditingClipboardCut<Payload, Result> {
  readonly clipboard: Payload;
  readonly result: Result;
}

/**
 * Runs the canonical cut lifecycle: project the current selection first, then
 * remove exactly that selection through the domain's editing transaction.
 */
export function cutEditingClipboard<Payload, Result>(
  copy: () => Payload | null,
  remove: (clipboard: Payload) => Result,
): EditingClipboardCut<Payload, Result> | null {
  const clipboard = copy();
  if (clipboard === null) return null;
  return { clipboard, result: remove(clipboard) };
}

export function isClipboardRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
