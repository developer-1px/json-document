import type {
  JSONDocument,
  JSONDocumentInsertTarget,
  JSONDocumentPasteOptions,
  JSONDocumentPasteTarget,
} from "@interactive-os/json-document/session";

import {
  decodeText,
} from "./codec.js";
import type {
  WebClipboardCanPasteResult,
  WebClipboardCodec,
  WebClipboardPasteResult,
} from "./types.js";

export function canPasteText<T>(
  doc: JSONDocument<T>,
  codec: WebClipboardCodec,
  target: JSONDocumentPasteTarget,
  text: string,
  pasteOptions?: JSONDocumentPasteOptions,
): WebClipboardCanPasteResult {
  const decoded = decodeText(codec, text);
  if (!decoded.ok) return decoded;
  return canApplyPayload(doc, target, decoded.payload, pasteOptions);
}

export function pasteText<T>(
  doc: JSONDocument<T>,
  codec: WebClipboardCodec,
  target: JSONDocumentPasteTarget,
  text: string,
  pasteOptions?: JSONDocumentPasteOptions,
): WebClipboardPasteResult<T> {
  const decoded = decodeText(codec, text);
  if (!decoded.ok) return decoded;

  const capability = canApplyPayload(doc, target, decoded.payload, pasteOptions);
  if (!capability.ok) return capability;

  return applyPayload(doc, target, decoded.payload, pasteOptions);
}

export function canApplyPayload<T>(
  doc: JSONDocument<T>,
  target: JSONDocumentPasteTarget,
  payload: unknown,
  options?: JSONDocumentPasteOptions,
): WebClipboardCanPasteResult {
  return isReplaceTarget(target)
    ? doc.canReplace(target.replace, payload)
    : doc.canInsert(target as JSONDocumentInsertTarget, payload, options);
}

export function applyPayload<T>(
  doc: JSONDocument<T>,
  target: JSONDocumentPasteTarget,
  payload: unknown,
  options?: JSONDocumentPasteOptions,
): WebClipboardPasteResult<T> {
  return isReplaceTarget(target)
    ? doc.replace(target.replace, payload)
    : doc.insert(target as JSONDocumentInsertTarget, payload, options);
}

function isReplaceTarget(target: JSONDocumentPasteTarget): target is { replace: string } {
  return typeof target === "object" && target !== null && "replace" in target;
}
