import type { RichTextNodeId } from "./model.js";

export function createRichTextNodeId(): RichTextNodeId {
  const cryptoProvider = (globalThis as { readonly crypto?: { readonly randomUUID?: () => string } }).crypto;
  const randomUUID = cryptoProvider?.randomUUID;
  if (typeof randomUUID !== "function") throw new TypeError("rich-text.id-provider-unavailable");
  return `rt-${randomUUID.call(cryptoProvider)}`;
}
