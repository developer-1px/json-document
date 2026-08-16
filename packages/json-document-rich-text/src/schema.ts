import type { JSONValue } from "@interactive-os/json-document";
import { RICH_TEXT_PROFILE_V1 } from "./model.js";

export interface RichTextAttributeSpec {
  readonly required: boolean;
  readonly default?: JSONValue;
  readonly nodeReference?: boolean;
  validate(value: JSONValue): boolean;
}

export interface RichTextContentSpec {
  readonly allowedTypes: ReadonlyArray<string>;
  readonly minimum: number;
  readonly maximum: number | null;
}

export interface RichTextNodeSpec {
  readonly group: "block" | "inline";
  readonly atom: boolean;
  readonly attrs: Readonly<Record<string, RichTextAttributeSpec>>;
  readonly content: RichTextContentSpec | null;
  readonly allowedMarks: "all" | "none" | ReadonlyArray<string>;
}

export interface RichTextMarkSpec {
  readonly attrs: Readonly<Record<string, RichTextAttributeSpec>>;
  readonly excludes: ReadonlyArray<string>;
  readonly rank: number;
}

export interface RichTextSchema {
  readonly profile: string;
  readonly nodes: Readonly<Record<string, RichTextNodeSpec>>;
  readonly marks: Readonly<Record<string, RichTextMarkSpec>>;
}

const officialMarkOrder = ["link", "strong", "emphasis", "underline", "strikethrough", "code"] as const;
const blockTypes = ["paragraph", "heading", "blockquote", "codeBlock", "bulletList", "orderedList"];
const inlineTypes = ["text", "hardBreak"];

const requiredInteger = (minimum: number, maximum = Number.POSITIVE_INFINITY): RichTextAttributeSpec => ({
  required: true,
  validate: (value) => typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum,
});
const requiredNullableString: RichTextAttributeSpec = {
  required: true,
  validate: (value) => value === null || typeof value === "string",
};
const requiredString: RichTextAttributeSpec = { required: true, validate: (value) => typeof value === "string" };
const optionalString: RichTextAttributeSpec = { required: false, validate: (value) => typeof value === "string" };

const officialNodes: Readonly<Record<string, RichTextNodeSpec>> = {
  doc: node("block", false, {}, content(blockTypes, 1), "none"),
  paragraph: node("block", false, {}, content(inlineTypes, 0), "all"),
  heading: node("block", false, { level: requiredInteger(1, 6) }, content(inlineTypes, 0), "all"),
  blockquote: node("block", false, {}, content(blockTypes, 1), "none"),
  codeBlock: node("block", false, { language: requiredNullableString }, content(["text"], 0, 1), "none"),
  bulletList: node("block", false, {}, content(["listItem"], 1), "none"),
  orderedList: node("block", false, { start: requiredInteger(1) }, content(["listItem"], 1), "none"),
  listItem: node("block", false, {}, content(blockTypes, 1), "none"),
  text: node("inline", true, {}, null, "none"),
  hardBreak: node("inline", true, {}, null, "none"),
};

const officialMarks = Object.fromEntries(
  officialMarkOrder.map((type, rank) => [type, {
    attrs: type === "link" ? { href: requiredString, title: optionalString } : {},
    excludes: type === "code" ? officialMarkOrder.filter((candidate) => candidate !== "code") : ["code"],
    rank,
  }]),
) as Readonly<Record<string, RichTextMarkSpec>>;

export const richTextSchemaV1: RichTextSchema = freezeSchema({
  profile: RICH_TEXT_PROFILE_V1,
  nodes: officialNodes,
  marks: officialMarks,
});

export function createRichTextSchema(options: {
  readonly profile: string;
  readonly nodes?: Readonly<Record<string, RichTextNodeSpec>>;
  readonly marks?: Readonly<Record<string, RichTextMarkSpec>>;
}): RichTextSchema {
  if (!isAbsoluteProfile(options.profile) || options.profile === RICH_TEXT_PROFILE_V1) {
    throw new TypeError("Rich Text extension profile must be a new absolute URI or URN.");
  }
  const nodes = options.nodes ?? {};
  const marks = options.marks ?? {};
  const extensionBlocks = Object.entries(nodes).filter(([, spec]) => spec.group === "block").map(([type]) => type);
  const extensionInlines = Object.entries(nodes).filter(([, spec]) => spec.group === "inline").map(([type]) => type);
  const baseNodes = Object.fromEntries(Object.entries(officialNodes).map(([type, spec]) => {
    const additions = type === "doc" || type === "blockquote" || type === "listItem"
      ? extensionBlocks
      : type === "paragraph" || type === "heading" ? extensionInlines : [];
    return [type, cloneNodeSpec(spec, additions)];
  })) as Readonly<Record<string, RichTextNodeSpec>>;
  for (const [type, spec] of Object.entries(nodes)) {
    assertExtensionType(type);
    if (type in officialNodes) throw new TypeError(`Official Rich Text node cannot be overridden: ${type}`);
    validateNodeSpec(type, spec, { ...baseNodes, ...nodes });
  }
  for (const [type, spec] of Object.entries(marks)) {
    assertExtensionType(type);
    if (type in officialMarks) throw new TypeError(`Official Rich Text mark cannot be overridden: ${type}`);
    validateMarkSpec(type, spec);
  }
  return freezeSchema({
    profile: options.profile,
    nodes: { ...baseNodes, ...Object.fromEntries(Object.entries(nodes).map(([type, spec]) => [type, cloneNodeSpec(spec)])) },
    marks: { ...officialMarks, ...Object.fromEntries(Object.entries(marks).map(([type, spec]) => [type, cloneMarkSpec(spec)])) },
  });
}

function cloneNodeSpec(spec: RichTextNodeSpec, additions: ReadonlyArray<string> = []): RichTextNodeSpec {
  return {
    ...spec,
    attrs: { ...spec.attrs },
    content: spec.content === null ? null : {
      ...spec.content,
      allowedTypes: [...spec.content.allowedTypes, ...additions],
    },
    allowedMarks: Array.isArray(spec.allowedMarks) ? [...spec.allowedMarks] : spec.allowedMarks,
  };
}

function cloneMarkSpec(spec: RichTextMarkSpec): RichTextMarkSpec {
  return { ...spec, attrs: { ...spec.attrs }, excludes: [...spec.excludes] };
}

export function compareRichTextMarks(schema: RichTextSchema, left: string, right: string): number {
  const rank = schema.marks[left]!.rank - schema.marks[right]!.rank;
  return rank === 0 ? left.localeCompare(right) : rank;
}

function node(
  group: "block" | "inline",
  atom: boolean,
  attrs: Readonly<Record<string, RichTextAttributeSpec>>,
  childContent: RichTextContentSpec | null,
  allowedMarks: RichTextNodeSpec["allowedMarks"],
): RichTextNodeSpec {
  return { group, atom, attrs, content: childContent, allowedMarks };
}

function content(allowedTypes: ReadonlyArray<string>, minimum: number, maximum: number | null = null): RichTextContentSpec {
  return { allowedTypes, minimum, maximum };
}

function validateNodeSpec(type: string, spec: RichTextNodeSpec, registry: Readonly<Record<string, RichTextNodeSpec>>): void {
  if (spec.atom && spec.content !== null) throw new TypeError(`${type}: atom nodes cannot declare content.`);
  if (spec.content === null && spec.allowedMarks !== "none") throw new TypeError(`${type}: leaf nodes must disallow marks.`);
  for (const [name, attr] of Object.entries(spec.attrs)) validateAttributeSpec(`${type}.${name}`, attr);
  if (spec.content === null) return;
  if (!Number.isInteger(spec.content.minimum) || spec.content.minimum < 0) throw new TypeError(`${type}: invalid minimum.`);
  if (spec.content.maximum !== null && (!Number.isInteger(spec.content.maximum) || spec.content.maximum < spec.content.minimum)) {
    throw new TypeError(`${type}: invalid maximum.`);
  }
  for (const childType of spec.content.allowedTypes) {
    if (!(childType in registry)) throw new TypeError(`${type}: unknown child type ${childType}.`);
  }
}

function validateMarkSpec(type: string, spec: RichTextMarkSpec): void {
  if (!Number.isInteger(spec.rank) || spec.rank < 0) throw new TypeError(`${type}: mark rank must be a non-negative integer.`);
  for (const [name, attr] of Object.entries(spec.attrs)) validateAttributeSpec(`${type}.${name}`, attr);
}

function validateAttributeSpec(name: string, spec: RichTextAttributeSpec): void {
  if (spec.required && spec.default !== undefined) throw new TypeError(`${name}: required attrs cannot have a default.`);
}

function assertExtensionType(type: string): void {
  if (!/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+\/[a-z][a-z0-9-]*$/.test(type)) {
    throw new TypeError(`Rich Text extension type must be reverse-DNS namespaced: ${type}`);
  }
}

function isAbsoluteProfile(profile: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:[^\s]+$/.test(profile);
}

function freezeSchema(schema: RichTextSchema): RichTextSchema {
  for (const spec of Object.values(schema.nodes)) {
    Object.freeze(spec.attrs);
    if (spec.content) {
      Object.freeze(spec.content.allowedTypes);
      Object.freeze(spec.content);
    }
    if (Array.isArray(spec.allowedMarks)) Object.freeze(spec.allowedMarks);
    Object.freeze(spec);
  }
  for (const spec of Object.values(schema.marks)) {
    Object.freeze(spec.attrs);
    Object.freeze(spec.excludes);
    Object.freeze(spec);
  }
  Object.freeze(schema.nodes);
  Object.freeze(schema.marks);
  return Object.freeze(schema);
}
