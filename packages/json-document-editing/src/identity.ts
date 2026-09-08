/** Create an opaque domain identity that is independent of editor and replica lifetimes. */
export function createEditingId(prefix: string): string {
  const provider = (globalThis as { readonly crypto?: { readonly randomUUID?: () => string } }).crypto;
  if (typeof provider?.randomUUID !== "function") throw new TypeError("editing.id-provider-unavailable");
  return `${prefix}-${provider.randomUUID()}`;
}
