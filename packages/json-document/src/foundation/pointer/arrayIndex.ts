export function parseArrayIndex(segment: string): number | null {
  if (segment === "0") return 0;
  if (segment.length === 0) return null;

  const first = segment.charCodeAt(0);
  if (first < 49 || first > 57) return null;
  for (let index = 1; index < segment.length; index += 1) {
    const code = segment.charCodeAt(index);
    if (code < 48 || code > 57) return null;
  }

  const value = Number(segment);
  return Number.isSafeInteger(value) ? value : null;
}
