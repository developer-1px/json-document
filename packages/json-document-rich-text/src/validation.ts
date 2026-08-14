import type { JSONValue, Pointer } from "@interactive-os/json-document";
import {
  RICH_TEXT_PROFILE_V1,
  type RichTextDocument,
  type RichTextNodeId,
} from "./model.js";
import { compareRichTextMarks, richTextSchemaV1, type RichTextSchema } from "./schema.js";

export type RichTextFailureCode =
  | "rich-text.invalid-document"
  | "rich-text.profile-unavailable"
  | "rich-text.schema-violation"
  | "rich-text.duplicate-id"
  | "rich-text.id-provider-unavailable"
  | "rich-text.noncanonical"
  | "rich-text.point-not-found"
  | "rich-text.invalid-offset"
  | "rich-text.intent-unsupported"
  | "rich-text.clipboard-invalid";

export interface RichTextValidationFailure {
  readonly ok: false;
  readonly code: RichTextFailureCode;
  readonly reason: string;
  readonly pointer?: Pointer;
  readonly nodeId?: RichTextNodeId;
}

export type RichTextValidationResult = { readonly ok: true } | RichTextValidationFailure;

export function validateRichText(
  value: unknown,
  options: { readonly schema?: RichTextSchema } = {},
): RichTextValidationResult {
  const schema = options.schema ?? richTextSchemaV1;
  if (!isJSONObject(value)) return fail("rich-text.invalid-document", "Rich Text document must be a JSON object.", "");
  if (typeof value.profile !== "string" || value.profile !== schema.profile) {
    return fail("rich-text.profile-unavailable", `Rich Text profile provider is unavailable for ${JSON.stringify(value.profile)}.`, "/profile");
  }
  if (value.type !== "doc") return fail("rich-text.schema-violation", "Rich Text root type must be doc.", "/type");
  const ids = new Set<string>();
  return validateNode(value, "", null);

  function validateNode(node: unknown, pointer: Pointer, parentType: string | null): RichTextValidationResult {
    if (!isJSONObject(node)) return fail("rich-text.schema-violation", "Rich Text node must be an object.", pointer);
    if (typeof node.id !== "string" || node.id.length === 0) return fail("rich-text.schema-violation", "Node id must be non-empty.", `${pointer}/id`);
    if (ids.has(node.id)) return { ...fail("rich-text.duplicate-id", `Duplicate node id ${JSON.stringify(node.id)}.`, pointer), nodeId: node.id };
    ids.add(node.id);
    if (typeof node.type !== "string" || schema.nodes[node.type] === undefined) {
      return fail("rich-text.schema-violation", `Unknown node type ${JSON.stringify(node.type)}.`, `${pointer}/type`);
    }
    const spec = schema.nodes[node.type]!;
    if (parentType !== null) {
      const parent = schema.nodes[parentType]!;
      if (!parent.content?.allowedTypes.includes(node.type)) {
        return fail("rich-text.schema-violation", `${node.type} is not allowed in ${parentType}.`, pointer);
      }
    }
    const attrsResult = validateAttrs(node, spec.attrs, pointer);
    if (!attrsResult.ok) return attrsResult;
    if (node.type === "text") return validateText(node, pointer, parentType);
    if (spec.content === null) {
      if ("content" in node || "text" in node || "marks" in node) return fail("rich-text.schema-violation", `${node.type} is an atom.`, pointer);
      return exactKeys(node, ["id", "type", ...(Object.keys(spec.attrs).length > 0 ? ["attrs"] : [])], pointer);
    }
    if (!Array.isArray(node.content)) return fail("rich-text.schema-violation", `${node.type}.content must be an array.`, `${pointer}/content`);
    if (node.content.length < spec.content.minimum || (spec.content.maximum !== null && node.content.length > spec.content.maximum)) {
      return fail("rich-text.schema-violation", `${node.type}.content cardinality is invalid.`, `${pointer}/content`);
    }
    const keyResult = exactKeys(node, ["id", "type", "content", ...(Object.keys(spec.attrs).length > 0 ? ["attrs"] : []), ...(node.type === "doc" ? ["profile"] : [])], pointer);
    if (!keyResult.ok) return keyResult;
    for (let index = 0; index < node.content.length; index += 1) {
      const result = validateNode(node.content[index], `${pointer}/content/${index}`, node.type);
      if (!result.ok) return result;
    }
    return { ok: true };
  }

  function validateText(node: Record<string, unknown>, pointer: Pointer, parentType: string | null): RichTextValidationResult {
    if (typeof node.text !== "string" || node.text.length === 0) return fail("rich-text.noncanonical", "Text nodes must be non-empty.", `${pointer}/text`);
    if (!Array.isArray(node.marks)) return fail("rich-text.schema-violation", "Text marks must be an array.", `${pointer}/marks`);
    const parentMarks = parentType === null ? "none" : schema.nodes[parentType]!.allowedMarks;
    if (parentMarks === "none" && node.marks.length > 0) return fail("rich-text.schema-violation", `${parentType} does not allow marks.`, `${pointer}/marks`);
    const seen = new Set<string>();
    let previous: string | null = null;
    for (let index = 0; index < node.marks.length; index += 1) {
      const mark = node.marks[index];
      if (!isJSONObject(mark) || typeof mark.type !== "string" || schema.marks[mark.type] === undefined) {
        return fail("rich-text.schema-violation", "Unknown mark.", `${pointer}/marks/${index}`);
      }
      const markType = mark.type as string;
      if (seen.has(markType)) return fail("rich-text.noncanonical", `Duplicate mark ${markType}.`, `${pointer}/marks/${index}`);
      if (previous !== null && compareRichTextMarks(schema, previous, markType) >= 0) {
        return fail("rich-text.noncanonical", "Marks are not in canonical order.", `${pointer}/marks`);
      }
      if (parentMarks !== "all" && parentMarks !== "none" && !parentMarks.includes(markType)) {
        return fail("rich-text.schema-violation", `${markType} is not allowed in ${parentType}.`, `${pointer}/marks/${index}`);
      }
      const markSpec = schema.marks[markType]!;
      if ([...seen].some((type) => markSpec.excludes.includes(type) || schema.marks[type]!.excludes.includes(markType))) {
        return fail("rich-text.schema-violation", `Mark ${markType} conflicts with another mark.`, `${pointer}/marks/${index}`);
      }
      const attrsResult = validateAttrs(mark, markSpec.attrs, `${pointer}/marks/${index}`);
      if (!attrsResult.ok) return attrsResult;
      const keys = ["type", ...(Object.keys(markSpec.attrs).length > 0 ? ["attrs"] : [])];
      const keyResult = exactKeys(mark, keys, `${pointer}/marks/${index}`);
      if (!keyResult.ok) return keyResult;
      seen.add(markType);
      previous = markType;
    }
    return exactKeys(node, ["id", "type", "text", "marks"], pointer);
  }
}

export function isRichTextDocumentForSchema(value: unknown, schema: RichTextSchema = richTextSchemaV1): value is RichTextDocument {
  return validateRichText(value, { schema }).ok;
}

function validateAttrs(
  owner: Record<string, unknown>,
  specs: RichTextSchema["nodes"][string]["attrs"],
  pointer: Pointer,
): RichTextValidationResult {
  const names = Object.keys(specs);
  if (names.length === 0) return "attrs" in owner ? fail("rich-text.schema-violation", "Unexpected attrs.", `${pointer}/attrs`) : { ok: true };
  if (!isJSONObject(owner.attrs)) return fail("rich-text.schema-violation", "Required attrs object is missing.", `${pointer}/attrs`);
  for (const [name, spec] of Object.entries(specs)) {
    const value = owner.attrs[name];
    if (value === undefined) {
      if (spec.required && spec.default === undefined) return fail("rich-text.schema-violation", `Missing attr ${name}.`, `${pointer}/attrs/${name}`);
      continue;
    }
    if (!isJSONValue(value) || !spec.validate(value)) return fail("rich-text.schema-violation", `Invalid attr ${name}.`, `${pointer}/attrs/${name}`);
  }
  for (const name of Object.keys(owner.attrs)) if (specs[name] === undefined) return fail("rich-text.schema-violation", `Unknown attr ${name}.`, `${pointer}/attrs/${name}`);
  return { ok: true };
}

function exactKeys(value: Record<string, unknown>, expected: ReadonlyArray<string>, pointer: Pointer): RichTextValidationResult {
  const allowed = new Set(expected);
  for (const key of Object.keys(value)) if (!allowed.has(key)) return fail("rich-text.schema-violation", `Unexpected property ${key}.`, `${pointer}/${key}`);
  return { ok: true };
}

function fail(code: RichTextFailureCode, reason: string, pointer?: Pointer): RichTextValidationFailure {
  return { ok: false, code, reason, ...(pointer === undefined ? {} : { pointer }) };
}

function isJSONObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJSONValue(value: unknown): value is JSONValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJSONValue);
  return isJSONObject(value) && Object.values(value).every(isJSONValue);
}

export { RICH_TEXT_PROFILE_V1 };
