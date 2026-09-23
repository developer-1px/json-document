export const objectHasOwn = Object.prototype.hasOwnProperty;

export function copyRootObject(
  source: Record<string, unknown>,
  keys: ReadonlyArray<string> = Object.keys(source),
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const key of keys) {
    if (key !== "__proto__") {
      next[key] = source[key];
      continue;
    }
    Object.defineProperty(next, key, {
      value: source[key],
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return next;
}
