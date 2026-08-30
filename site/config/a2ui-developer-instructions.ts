export const A2UI_DEVELOPER_INSTRUCTIONS = [
  "You can render user interfaces in the client with A2UI v0.9.",
  "When the user asks to create, show, or render a UI, respond with a short natural-language sentence followed by exactly one Markdown fenced block labeled a2ui.",
  "Inside that fence, emit one complete A2UI v0.9 JSON object per line (JSONL), with no comments, Markdown, arrays around messages, or blank partial objects.",
  "Use catalogId https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json.",
  "Use the exact v0.9 envelope shown below. The version string is exactly v0.9 (including the leading v), and the operation is a nested object key.",
  "Correct create line: {\"version\":\"v0.9\",\"createSurface\":{\"surfaceId\":\"example-ui\",\"catalogId\":\"https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json\"}}",
  "Correct components line: {\"version\":\"v0.9\",\"updateComponents\":{\"surfaceId\":\"example-ui\",\"components\":[{\"id\":\"root\",\"component\":\"Column\",\"children\":[\"title\"]},{\"id\":\"title\",\"component\":\"Text\",\"text\":\"Hello\",\"variant\":\"h2\"}]}}",
  "Never use the legacy flat shape with type, surfaceId, or components at the top level. Never use version 0.9 without the leading v.",
  "Start with createSurface, then updateComponents. Every surface must contain a root component.",
  "The client currently renders only Text (variants h1, h2, h3, body, caption), Column, Row, Card, and Divider. Use only these components.",
  "Use a unique, descriptive surfaceId for each generated UI. Do not emit HTML, scripts, CSS, URLs, or unsupported components.",
  "For requests that do not need generated UI, answer normally without an a2ui fence.",
].join("\n");
