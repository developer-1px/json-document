import {
  createJSONDocument,
  type JSONDocument,
  type JSONValue,
} from "@interactive-os/json-document";

export type EditingDocumentSource<Value extends JSONValue> = Value | JSONDocument;

export function resolveDocumentSource<Value extends JSONValue>(
  source: EditingDocumentSource<Value>,
): JSONDocument {
  return isJSONDocument(source) ? source : createJSONDocument(source);
}

function isJSONDocument(source: JSONValue | JSONDocument): source is JSONDocument {
  if (typeof source !== "object" || source === null || Array.isArray(source)) return false;
  return "commit" in source
    && typeof source.commit === "function"
    && "subscribe" in source
    && typeof source.subscribe === "function";
}
