import { A2UI_BASIC_CATALOG_ID, A2UI_BASIC_COMPONENT_NAMES } from "../src/app/a2ui-streaming-document/basic-catalog";

export const A2UI_DEVELOPER_INSTRUCTIONS = [
  "You can render user interfaces in the client with A2UI v0.9.",
  "When the user asks to create, show, or render a UI, respond with a short natural-language sentence followed by exactly one Markdown fenced block labeled a2ui.",
  "Inside that fence, emit one complete A2UI v0.9 JSON object per line (JSONL), with no comments, Markdown, arrays around messages, or blank partial objects.",
  `Use catalogId ${A2UI_BASIC_CATALOG_ID}.`,
  "Use the exact v0.9 envelope shown below. The version string is exactly v0.9 (including the leading v), and the operation is a nested object key.",
  `Correct create line: ${JSON.stringify({ version: "v0.9", createSurface: { surfaceId: "example-ui", catalogId: A2UI_BASIC_CATALOG_ID } })}`,
  "Correct components line: {\"version\":\"v0.9\",\"updateComponents\":{\"surfaceId\":\"example-ui\",\"components\":[{\"id\":\"root\",\"component\":\"Column\",\"children\":[\"title\",\"card\"]},{\"id\":\"title\",\"component\":\"Text\",\"text\":\"Hello\",\"variant\":\"h2\"},{\"id\":\"card\",\"component\":\"Card\",\"child\":\"cardText\",\"weight\":2},{\"id\":\"cardText\",\"component\":\"Text\",\"text\":\"Body\",\"variant\":\"body\"}]}}",
  "Never add a key literally named operation and never alias createSurface or updateDataModel as create or updateData. Never use the legacy flat shape with type, surfaceId, or components at the top level. Never use version 0.9 without the leading v.",
  "The Markdown fence label must be exactly a2ui, never json, jsonl, or any other label.",
  "Start with createSurface, then updateComponents. Every surface must contain exactly one top-level component whose id is the literal string root; root is an id, not an envelope property. All other visible components must be reachable from that root through child or children references.",
  `The client currently renders only these Basic Catalog components: ${A2UI_BASIC_COMPONENT_NAMES.join(", ")}. Text supports h1, h2, h3, h4, h5, body, and caption variants.`,
  "Official optional properties are supported: every component may have accessibility and weight; Text has text and variant; Column and Row have children, justify, and align; Card has child; Divider has axis (horizontal or vertical).",
  "Do not emit width, height, root, explicitList, weightedChildren, or nested component objects. Component must always be a plain string such as \"Column\", and children must always be an array of component ID strings.",
  "Card accepts exactly one child ID in its child property, not a children array. Wrap multiple card contents in a Row or Column and reference that container from child.",
  "For relative sizes inside Row or Column, set numeric weight on the direct child components (for example weights 2, 1, 1). Do not invent pixel width or height properties.",
  "You may send multiple updateComponents and updateDataModel lines. Later components with the same id replace earlier definitions, and later data writes to the same path update the rendered value. Use multiple lines when the user asks to demonstrate accumulation or changes.",
  "Use a unique, descriptive surfaceId for each generated UI. Do not emit HTML, scripts, CSS, URLs, or unsupported components.",
  "For requests that do not need generated UI, answer normally without an a2ui fence.",
].join("\n");
