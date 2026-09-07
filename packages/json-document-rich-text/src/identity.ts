import type { RichTextNodeId } from "./model.js";
import { createEditingId } from "@interactive-os/json-document-editing";

export function createRichTextNodeId(): RichTextNodeId {
  try {
    return createEditingId("rt");
  } catch (cause) {
    throw new TypeError("rich-text.id-provider-unavailable", { cause });
  }
}
