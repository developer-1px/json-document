import { type JSONPatchOperation, type JSONValue, type Pointer } from "@interactive-os/json-document";
import type { RangeSelectionMapping } from "@interactive-os/json-document-selection";
import { createRichTextNodeId } from "./identity.js";
import {
  RICH_TEXT_PROFILE_V1,
  hasRichTextContent,
  isRichTextText,
  type RichTextDocument,
  type RichTextNode,
  type RichTextNodeId,
  type RichTextPoint,
} from "./model.js";
import { compareRichTextMarks, richTextSchemaV1, type RichTextSchema } from "./schema.js";
import { validateRichText, type RichTextValidationFailure } from "./validation.js";

export type RichTextNormalizationResult =
  | {
      readonly ok: true;
      readonly value: RichTextDocument;
      readonly operations: ReadonlyArray<JSONPatchOperation>;
      readonly mapping: RangeSelectionMapping<RichTextPoint>;
    }
  | RichTextValidationFailure;

type RetiredPoint =
  | { readonly kind: "text"; readonly nodeId: string; readonly offset: number; readonly addOriginalOffset: boolean }
  | { readonly kind: "child"; readonly nodeId: string; readonly offset: number };

export function normalizeRichText(
  value: unknown,
  options: { readonly schema?: RichTextSchema; readonly createId?: () => RichTextNodeId } = {},
): RichTextNormalizationResult {
  const schema = options.schema ?? richTextSchemaV1;
  if (!isObject(value) || value.type !== "doc") return failure("rich-text.invalid-document", "Rich Text document must be a doc object.");
  if (value.profile !== schema.profile) return failure("rich-text.profile-unavailable", "Rich Text profile provider is unavailable.");
  const cloned = JSON.parse(JSON.stringify(value)) as RichTextDocument;
  const operations: JSONPatchOperation[] = [];
  const retired = new Map<string, RetiredPoint>();
  const normalized = normalizeNode(cloned, "") as RichTextDocument | RichTextValidationFailure;
  if (isFailure(normalized)) return normalized;
  let document = normalized as RichTextDocument;
  if (document.content.length === 0) {
    let id: string;
    try { id = (options.createId ?? createRichTextNodeId)(); } catch {
      return failure("rich-text.id-provider-unavailable", "An ID provider is required to restore an empty paragraph.");
    }
    document = { ...document, content: [{ id, type: "paragraph", content: [] }] };
    operations.push({ op: "replace", path: "/content", value: detached(document.content) });
  }
  const validation = validateRichText(document, { schema });
  if (!validation.ok) return validation;
  return {
    ok: true,
    value: document,
    operations,
    mapping: {
      mapPoint(point) {
        const replacement = retired.get(point.nodeId);
        if (replacement === undefined) return point;
        if (replacement.kind === "child") return { ...replacement, affinity: point.affinity };
        return {
          ...point,
          kind: "text",
          nodeId: replacement.nodeId,
          offset: replacement.offset + (replacement.addOriginalOffset ? point.offset : 0),
        };
      },
    },
  };

  function normalizeNode(node: RichTextNode | RichTextDocument, pointer: Pointer): RichTextNode | RichTextDocument | RichTextValidationFailure {
    if (!isObject(node) || typeof node.type !== "string" || schema.nodes[node.type] === undefined) {
      return failure("rich-text.schema-violation", `Unknown node type ${JSON.stringify((node as { type?: unknown }).type)}.`, pointer);
    }
    if (isRichTextText(node as RichTextNode)) {
      const text = node as Extract<RichTextNode, { readonly type: "text" }>;
      if (!Array.isArray(text.marks)) return failure("rich-text.schema-violation", "Text marks must be an array.", `${pointer}/marks`);
      const known = text.marks.every((mark) => isObject(mark) && typeof mark.type === "string" && schema.marks[mark.type] !== undefined);
      if (!known) return failure("rich-text.schema-violation", "Unknown mark cannot be normalized.", `${pointer}/marks`);
      const byType = new Map(text.marks.map((mark) => [mark.type, mark]));
      const marks = [...byType.values()].sort((left, right) => compareRichTextMarks(schema, left.type, right.type));
      const canonicalMarks = marks.some((mark) => mark.type === "code") ? marks.filter((mark) => mark.type === "code") : marks;
      if (JSON.stringify(canonicalMarks) === JSON.stringify(text.marks)) return text;
      operations.push({ op: "replace", path: `${pointer}/marks`, value: detached(canonicalMarks) });
      return { ...text, marks: canonicalMarks };
    }
    if (!hasRichTextContent(node)) return node;
    const children: RichTextNode[] = [];
    const removedEmptyTexts: Array<{ readonly id: string; readonly offset: number }> = [];
    const childOperationsStart = operations.length;
    let structuralChanged = false;
    let descendantChanged = false;
    for (let index = 0; index < node.content.length; index += 1) {
      const child = normalizeNode(node.content[index]!, `${pointer}/content/${index}`);
      if (isFailure(child)) return child;
      const normalizedChild = child as RichTextNode;
      if (isRichTextText(normalizedChild) && normalizedChild.text.length === 0) {
        structuralChanged = true;
        removedEmptyTexts.push({ id: normalizedChild.id, offset: children.length });
        continue;
      }
      const previous = children.at(-1);
      if (previous && isRichTextText(previous) && isRichTextText(normalizedChild)
        && JSON.stringify(previous.marks) === JSON.stringify(normalizedChild.marks)) {
        children[children.length - 1] = { ...previous, text: previous.text + normalizedChild.text };
        retired.set(normalizedChild.id, { kind: "text", nodeId: previous.id, offset: previous.text.length, addOriginalOffset: true });
        structuralChanged = true;
      } else {
        children.push(normalizedChild);
        if (normalizedChild !== node.content[index]) descendantChanged = true;
      }
    }
    for (const removed of removedEmptyTexts) {
      const previous = children[removed.offset - 1];
      const next = children[removed.offset];
      if (previous && isRichTextText(previous)) {
        retired.set(removed.id, { kind: "text", nodeId: previous.id, offset: previous.text.length, addOriginalOffset: false });
      } else if (next && isRichTextText(next)) {
        retired.set(removed.id, { kind: "text", nodeId: next.id, offset: 0, addOriginalOffset: false });
      } else {
        retired.set(removed.id, { kind: "child", nodeId: node.id, offset: removed.offset });
      }
    }
    if (!structuralChanged) return descendantChanged ? { ...node, content: children } as RichTextNode | RichTextDocument : node;
    operations.splice(childOperationsStart);
    operations.push({ op: "replace", path: `${pointer}/content`, value: detached(children) });
    return { ...node, content: children } as RichTextNode | RichTextDocument;
  }
}

function failure(code: RichTextValidationFailure["code"], reason: string, pointer?: Pointer): RichTextValidationFailure {
  return { ok: false, code, reason, ...(pointer === undefined ? {} : { pointer }) };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFailure(value: RichTextNode | RichTextDocument | RichTextValidationFailure): value is RichTextValidationFailure {
  return "ok" in value && value.ok === false;
}

function detached<Value extends JSONValue>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}
