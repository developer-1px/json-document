/** A contiguous replacement in the old string's UTF-16 coordinates. */
export interface TextChange {
  readonly from: number;
  readonly to: number;
  readonly insert: string;
}

/** Smallest contiguous replacement; native DOM and full-value commits can use the same change contract. */
export function diffText(before: string, after: string): TextChange | null {
  if (before === after) return null;
  let from = 0;
  const length = Math.min(before.length, after.length);
  while (from < length && before.charCodeAt(from) === after.charCodeAt(from)) from++;
  let to = before.length, nextTo = after.length;
  while (to > from && nextTo > from && before.charCodeAt(to - 1) === after.charCodeAt(nextTo - 1)) { to--; nextTo--; }
  return { from, to, insert: after.slice(from, nextTo) };
}
