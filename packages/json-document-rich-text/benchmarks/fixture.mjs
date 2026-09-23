const RICH_TEXT_PROFILE_V1 = "urn:interactive-os:json-document:rich-text:1";

export function createRichTextBlockFixture(size, options = {}) {
  if (!Number.isInteger(size) || size < 0) throw new TypeError("Rich Text fixture size must be a non-negative integer.");
  const prefix = options.idPrefix ?? "block";
  const text = options.text ?? "x";
  return {
    profile: RICH_TEXT_PROFILE_V1,
    id: "fixture-doc",
    type: "doc",
    content: Array.from({ length: size }, (_, index) => ({
      id: `${prefix}-${index}`,
      type: "paragraph",
      content: [{
        id: `${prefix}-text-${index}`,
        type: "text",
        text,
        marks: [],
      }],
    })),
  };
}
