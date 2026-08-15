import { RICH_TEXT_PROFILE_V1, type RichTextDocument } from "./model.js";

export function createRichTextBlockFixture(
  size: number,
  options: { readonly text?: string; readonly idPrefix?: string } = {},
): RichTextDocument {
  if (!Number.isInteger(size) || size < 0) throw new TypeError("Rich Text fixture size must be a non-negative integer.");
  const prefix = options.idPrefix ?? "block";
  const text = options.text ?? "x";
  return {
    profile: RICH_TEXT_PROFILE_V1,
    id: "fixture-doc",
    type: "doc",
    content: Array.from({ length: size }, (_, index) => ({
      id: `${prefix}-${index}`,
      type: "paragraph" as const,
      content: [{
        id: `${prefix}-text-${index}`,
        type: "text" as const,
        text,
        marks: [],
      }],
    })),
  };
}
