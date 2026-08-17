import type { JSONDocument, Pointer } from "@interactive-os/json-document";
import { getActiveRichTextInstrument } from "./instrument.js";
import { isRichTextDocument, type RichTextDocument } from "./model.js";
import type { RichTextSchema } from "./schema.js";
import { validateRichText, validateRichTextPath } from "./validation.js";

export function readRichTextDocument(document: JSONDocument, pointer: Pointer): RichTextDocument {
  const result = document.at(pointer);
  if (!result.ok || !isRichTextDocument(result.value)) throw new TypeError(`Rich Text document was not found at ${JSON.stringify(pointer)}.`);
  return result.value;
}

export function validateLocalOrFallback(next: RichTextDocument, path: ReadonlyArray<number>, schema: RichTextSchema): ReturnType<typeof validateRichText> {
  const incremental = validateRichTextPath(next, path, { schema });
  if (incremental.ok) return incremental;
  getActiveRichTextInstrument()?.validate("full-fallback");
  return validateRichText(next, { schema });
}
