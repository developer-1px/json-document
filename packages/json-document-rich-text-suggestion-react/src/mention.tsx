import {Avatar, RecordSummary, SelectableItem, Tag, contentPresentation, floatingSurface} from "@interactive-os/json-document-ui-primitives-react";
import type { RichTextEditor, RichTextNode, RichTextPoint } from "@interactive-os/json-document-rich-text";
import {
  RICH_TEXT_MENTION_NODE,
  insertRichTextMention,
  resolveRichTextSuggestions,
  type RichTextMentionSuggestion,
  type RichTextSuggestionTrigger,
} from "@interactive-os/json-document-rich-text-suggestion";
import { useRichTextSuggestion, type RichTextSuggestionBinding } from "./index.js";
import { useSyncExternalStore, type HTMLAttributes, type ReactNode } from "react";

export interface RichTextMentionAtomProps extends HTMLAttributes<HTMLSpanElement> {
  readonly node: RichTextNode;
  readonly editor?: RichTextEditor;
  readonly renderIcon?: (entityId: string, label: string) => ReactNode;
}

/** Projects a canonical entity mention and its adjacent-caret focus state. */
export function RichTextMentionAtom({ node, editor, renderIcon, style, ...props }: RichTextMentionAtomProps): ReactNode {
  useSyncExternalStore(editor?.subscribe ?? emptySubscribe, editor === undefined ? zeroRevision : () => editor.snapshot.revision, zeroRevision);
  if (node.type !== RICH_TEXT_MENTION_NODE) return null;
  const attrs = "attrs" in node ? node.attrs as { readonly entityId?: unknown; readonly label?: unknown } : {};
  const entityId = typeof attrs.entityId === "string" ? attrs.entityId : "";
  const label = typeof attrs.label === "string" ? attrs.label : node.type;
  const focused = editor === undefined ? false : mentionIsAdjacentToCaret(editor, node.id);
  return <Tag {...props} contentEditable={false} data-rich-text-mention="" data-rich-text-node-id={node.id} data-focus={focused || undefined} style={style}>
    <span aria-hidden="true">{renderIcon?.(entityId, label) ?? "@"}</span>
    <span>{label}</span>
  </Tag>;
}

export interface UseRichTextMentionSuggestionsOptions<Suggestion extends RichTextMentionSuggestion> {
  readonly id: string;
  readonly label: string;
  readonly editor: RichTextEditor;
  readonly trigger: RichTextSuggestionTrigger | null;
  readonly suggestions: ReadonlyArray<Suggestion>;
  readonly createId: () => string;
}

export function useRichTextMentionSuggestions<Suggestion extends RichTextMentionSuggestion>(options: UseRichTextMentionSuggestionsOptions<Suggestion>): RichTextSuggestionBinding<Suggestion> {
  const trigger = options.trigger?.trigger === "@" ? options.trigger : null;
  return useRichTextSuggestion({
    id: options.id,
    label: options.label,
    trigger,
    candidates: trigger === null ? [] : resolveRichTextSuggestions(trigger, options.suggestions),
    onAction: (suggestion, trigger) => { insertRichTextMention(options.editor, trigger.range, suggestion, { createId: options.createId }); },
  });
}

export interface RichTextMentionSuggestionsProps<Suggestion extends RichTextMentionSuggestion> extends HTMLAttributes<HTMLDivElement> {
  readonly binding: RichTextSuggestionBinding<Suggestion>;
  readonly groupLabel?: string;
}

/** Renders the canonical mention candidate information hierarchy and interaction states. */
export function RichTextMentionSuggestions<Suggestion extends RichTextMentionSuggestion>({ binding, groupLabel = "Agents", style, className, ...props }: RichTextMentionSuggestionsProps<Suggestion>): ReactNode {
  if (!binding.open) return null;
  return <div {...props} {...binding.listboxProps} className={[floatingSurface.panel, "json-document-suggestion-list", className].filter(Boolean).join(" ")} data-rich-text-mention-suggestions="" style={style}>
    <div role="presentation" className={contentPresentation.caption}>{groupLabel}</div>
    <div role="presentation" className="json-document-suggestion-options">
      {binding.items.map(item => <SelectableItem key={item.id} as="button" type="button" presentation="row" selected={false} focus={item.id === binding.activeItem?.id} {...binding.optionProps(item)} data-rich-text-mention-suggestion="" title={item.description ?? item.label}>
        <RecordSummary title={item.label} summary={item.description} leading={<span aria-hidden="true"><Avatar name={item.label} src={item.iconUrl} fallback={item.iconText}/></span>}/>
      </SelectableItem>)}
    </div>
  </div>;
}

function mentionIsAdjacentToCaret(editor: RichTextEditor, nodeId: string): boolean {
  const selection = editor.snapshot.selection;
  const range = selection.primaryIndex === null ? null : selection.ranges[selection.primaryIndex] ?? null;
  if (range === null || !samePoint(range.anchor, range.focus)) return false;
  const atom = editor.topology.locate(nodeId);
  if (atom === null || atom.path.length === 0) return false;
  const atomParent = atom.path.slice(0, -1);
  const atomIndex = atom.path.at(-1)!;
  const point = range.focus;
  if (point.kind === "child") {
    const containerPath = editor.topology.locate(point.nodeId)?.path ?? [];
    return samePath(containerPath, atomParent) && (point.offset === atomIndex || point.offset === atomIndex + 1);
  }
  const text = editor.topology.locate(point.nodeId);
  if (text === null || text.path.length === 0 || text.node.type !== "text" || !("text" in text.node)) return false;
  if (!samePath(text.path.slice(0, -1), atomParent)) return false;
  const textIndex = text.path.at(-1)!;
  return (textIndex === atomIndex + 1 && point.offset === 0) || (textIndex === atomIndex - 1 && point.offset === text.node.text.length);
}

function samePoint(left: RichTextPoint, right: RichTextPoint): boolean { return left.kind === right.kind && left.nodeId === right.nodeId && left.offset === right.offset; }
function samePath(left: ReadonlyArray<number>, right: ReadonlyArray<number>): boolean { return left.length === right.length && left.every((segment, index) => segment === right[index]); }
function emptySubscribe(): () => void { return () => {}; }
function zeroRevision(): number { return 0; }

