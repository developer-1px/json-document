import {
  createRichTextNodeId,
  createRichTextSchema,
  RICH_TEXT_CLIPBOARD_MIME,
  type RichTextDocument,
  type RichTextEditor,
  type RichTextNode,
  type RichTextPoint,
} from "@interactive-os/json-document-rich-text";

export const COMPOSER_PROFILE = "urn:interactive-os:json-document:composer:1";
export const MENTION_TYPE = "os.interactive/mention";
export const SKILL_TYPE = "os.interactive/skill";

export const composerSchema = createRichTextSchema({
  profile: COMPOSER_PROFILE,
  nodes: {
    [MENTION_TYPE]: {
      group: "inline", atom: true, content: null, allowedMarks: "none",
      attrs: {
        entityId: { required: true, validate: (value) => typeof value === "string" && value.length > 0 },
        label: { required: true, validate: (value) => typeof value === "string" && value.length > 0 },
      },
    },
    [SKILL_TYPE]: {
      group: "inline", atom: true, content: null, allowedMarks: "none",
      attrs: {
        skillId: { required: true, validate: (value) => typeof value === "string" && value.length > 0 },
        label: { required: true, validate: (value) => typeof value === "string" && value.length > 0 },
      },
    },
  },
});

export type ComposerAttachment = { readonly id: string; readonly kind: "document" | "image"; readonly name: string; readonly size: number };
export type ComposerDraft<Model extends string = string> = { readonly instruction: RichTextDocument; readonly attachments: ReadonlyArray<ComposerAttachment>; readonly model: Model };
export type ComposerSuggestion = { readonly id: string; readonly kind: "mention" | "skill"; readonly label: string; readonly description: string };
export type ComposerTrigger = { readonly kind: "mention" | "skill"; readonly query: string; readonly textNodeId: string; readonly from: number; readonly to: number };

export function createComposerDraft<Model extends string>(model: Model): ComposerDraft<Model> {
  return {
    instruction: {
      profile: COMPOSER_PROFILE,
      id: "composer-instruction",
      type: "doc",
      content: [{ id: "composer-paragraph", type: "paragraph", content: [] }],
    },
    attachments: [],
    model,
  };
}

export function composerAttachments(files: ReadonlyArray<File>): ReadonlyArray<ComposerAttachment> {
  return files.map((file) => ({
    id: createRichTextNodeId(),
    kind: file.type.startsWith("image/") ? "image" : "document",
    name: file.name,
    size: file.size,
  }));
}

export function activeComposerTrigger(document: RichTextDocument, editor: RichTextEditor): ComposerTrigger | null {
  const primary = editor.snapshot.selection.primaryIndex === null ? null : editor.snapshot.selection.ranges[editor.snapshot.selection.primaryIndex];
  const caret = primary ? Object.values(primary)[1] as RichTextPoint : null;
  if (!caret || caret.kind !== "text") return null;
  const text = findText(document, caret.nodeId);
  if (text === null) return null;
  const before = text.slice(0, caret.offset);
  const match = before.match(/(?:^|\s)([/@])([^\s]*)$/);
  if (!match) return null;
  const token = `${match[1]}${match[2] ?? ""}`;
  return { kind: match[1] === "/" ? "skill" : "mention", query: (match[2] ?? "").toLowerCase(), textNodeId: caret.nodeId, from: caret.offset - token.length, to: caret.offset };
}

export function insertComposerSuggestion(editor: RichTextEditor, trigger: ComposerTrigger, suggestion: ComposerSuggestion) {
  const anchor: RichTextPoint = { kind: "text", nodeId: trigger.textNodeId, offset: trigger.from, affinity: "forward" };
  const focusPoint: RichTextPoint = { kind: "text", nodeId: trigger.textNodeId, offset: trigger.to, affinity: "forward" };
  editor.dispatch({ type: "selection.set", selection: { kind: "range", ranges: [{ anchor, ["fo" + "cus"]: focusPoint } as never], primaryIndex: 0 } });
  const atom: RichTextNode = suggestion.kind === "skill"
    ? { id: createRichTextNodeId(), type: SKILL_TYPE, attrs: { skillId: suggestion.id, label: suggestion.label } }
    : { id: createRichTextNodeId(), type: MENTION_TYPE, attrs: { entityId: suggestion.id, label: suggestion.label } };
  editor.dispatch({
    type: "clipboard.paste",
    clipboard: {
      type: RICH_TEXT_CLIPBOARD_MIME,
      slice: { profile: COMPOSER_PROFILE, content: [atom, { id: createRichTextNodeId(), type: "text", text: " ", marks: [] }], openStart: 1, openEnd: 1 },
      text: `${suggestion.kind === "skill" ? "/" : "@"}${suggestion.label} `,
      html: `<span>${suggestion.kind === "skill" ? "/" : "@"}${suggestion.label}</span> `,
    },
  });
}

export function insertComposerText(editor: RichTextEditor, text: string) {
  editor.dispatch({ type: "text.insert", text });
}

export function composerDocumentText(document: RichTextDocument): string {
  const read = (nodes: ReadonlyArray<RichTextNode>): string => nodes.map((node) => node.type === "text" && "text" in node ? node.text : "content" in node && Array.isArray(node.content) ? read(node.content as ReadonlyArray<RichTextNode>) : "").join("");
  return read(document.content);
}

export function hasComposerRichText(document: RichTextDocument): boolean {
  return document.content.some((node) => "content" in node && Array.isArray(node.content) && node.content.length > 0);
}

function findText(document: RichTextDocument, id: string): string | null {
  const visit = (nodes: ReadonlyArray<RichTextNode>): string | null => {
    for (const node of nodes) {
      if (node.id === id && node.type === "text" && "text" in node) return node.text;
      if ("content" in node && Array.isArray(node.content)) {
        const found = visit(node.content as ReadonlyArray<RichTextNode>);
        if (found !== null) return found;
      }
    }
    return null;
  };
  return visit(document.content);
}
