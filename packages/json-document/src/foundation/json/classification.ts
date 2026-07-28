export function isJsonArrayIndexKey(key: string): boolean {
  if (key === "") return false;
  const index = Number(key);
  return Number.isInteger(index)
    && index >= 0
    && index < 2 ** 32 - 1
    && String(index) === key;
}
