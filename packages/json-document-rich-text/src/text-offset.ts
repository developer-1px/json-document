export function validTextOffset(text: string, offset: number): boolean {
  if (!Number.isInteger(offset) || offset < 0 || offset > text.length) return false;
  if (offset === 0 || offset === text.length) return true;
  const previous = text.charCodeAt(offset - 1);
  const next = text.charCodeAt(offset);
  return !(previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff);
}

export function previousScalarOffset(text: string, offset: number): number {
  if (offset <= 0) return 0;
  const previous = text.charCodeAt(offset - 1);
  return previous >= 0xdc00 && previous <= 0xdfff && offset >= 2 ? offset - 2 : offset - 1;
}

export function nextScalarOffset(text: string, offset: number): number {
  if (offset >= text.length) return text.length;
  const current = text.charCodeAt(offset);
  return current >= 0xd800 && current <= 0xdbff && offset + 1 < text.length ? offset + 2 : offset + 1;
}
