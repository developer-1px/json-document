/** Create an opaque domain identity that is independent of editor and replica lifetimes. */
export function createEditingId(prefix: string): string {
  const provider = (globalThis as { readonly crypto?: { readonly randomUUID?: () => string } }).crypto;
  if (typeof provider?.randomUUID !== "function") throw new TypeError("editing.id-provider-unavailable");
  return `${prefix}-${provider.randomUUID()}`;
}

/** Reserve collision-free IDs across one editing batch. Reads existing IDs once. */
export function createEditingIdAllocator(
  existingIds: Iterable<string>,
  createId: () => string,
  subject: string,
): () => string {
  const occupied = new Set(existingIds);
  return () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const id = createId();
      if (!occupied.has(id)) {
        occupied.add(id);
        return id;
      }
    }
    throw new Error(`createId did not produce a unique ${subject} id`);
  };
}
