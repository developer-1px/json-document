import { resolveDocumentURL, type DocumentURLPolicy } from "@interactive-os/json-document-url";

const policy: DocumentURLPolicy = {
  schemes: ["http", "https", "mailto", "tel"],
  relative: "explicit",
  controlCharacters: "reject",
};

/** Rich Text link eligibility shared by rendering and clipboard import/export. */
export function resolveRichTextLinkURL(value: string | null | undefined): string | undefined {
  return resolveDocumentURL(value, policy);
}
