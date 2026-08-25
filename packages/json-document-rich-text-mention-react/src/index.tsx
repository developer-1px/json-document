import { RICH_TEXT_MENTION_NODE, insertRichTextMentionSuggestion, resolveRichTextMentionSuggestions, type RichTextMentionSuggestion } from "@interactive-os/json-document-rich-text-mention";
import type { RichTextEditor, RichTextNode, RichTextPoint } from "@interactive-os/json-document-rich-text";
import type { RichTextSuggestionTrigger } from "@interactive-os/json-document-rich-text-suggestion";
import { useRichTextSuggestion, type RichTextSuggestionBinding } from "@interactive-os/json-document-rich-text-suggestion-react";
import { useSyncExternalStore, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

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
  return <span {...props} contentEditable={false} data-rich-text-mention="" data-rich-text-node-id={node.id} data-focus={focused || undefined} style={{ ...mentionAtomStyle, ...(focused ? mentionAtomFocusedStyle : {}), ...style }}>
    <span aria-hidden="true" style={mentionAtomIconStyle}>{renderIcon?.(entityId, label) ?? "@"}</span>
    <span>{label}</span>
  </span>;
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
  const suggestions = resolveRichTextMentionSuggestions(options.trigger, options.suggestions);
  return useRichTextSuggestion({
    id: options.id,
    label: options.label,
    trigger: options.trigger?.trigger === "@" ? options.trigger : null,
    candidates: suggestions,
    onAction: (suggestion, trigger) => { insertRichTextMentionSuggestion(options.editor, trigger, suggestion, { createId: options.createId }); },
  });
}

export interface RichTextMentionSuggestionsProps<Suggestion extends RichTextMentionSuggestion> extends HTMLAttributes<HTMLDivElement> {
  readonly binding: RichTextSuggestionBinding<Suggestion>;
  readonly groupLabel?: string;
}

/** Renders the canonical mention candidate information hierarchy and interaction states. */
export function RichTextMentionSuggestions<Suggestion extends RichTextMentionSuggestion>({ binding, groupLabel = "Agents", style, ...props }: RichTextMentionSuggestionsProps<Suggestion>): ReactNode {
  if (!binding.open) return null;
  return <div {...props} {...binding.listboxProps} data-rich-text-mention-suggestions="" style={{ ...suggestionSurfaceStyle, ...style }}>
    <div role="presentation" style={suggestionGroupLabelStyle}>{groupLabel}</div>
    <div role="presentation" style={suggestionScrollStyle}>
      {binding.items.map((item) => {
        const active = item.id === binding.activeItem?.id;
        return <button key={item.id} {...binding.optionProps(item)} data-rich-text-mention-suggestion="" style={{ ...suggestionRowStyle, ...(active ? suggestionRowActiveStyle : {}), ...(item.disabled ? suggestionRowDisabledStyle : {}) }} title={item.description ?? item.label}>
          {item.iconUrl ? <img src={item.iconUrl} alt="" aria-hidden="true" style={suggestionIconStyle} /> : <span aria-hidden="true" style={suggestionIconFallbackStyle}>{item.iconText ?? item.label.slice(0, 1).toLocaleUpperCase()}</span>}
          <span style={suggestionTextStyle}>
            <strong style={suggestionTitleStyle}>{item.label}</strong>
            {item.description ? <small style={suggestionDescriptionStyle}>{item.description}</small> : null}
          </span>
        </button>;
      })}
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

const mentionAtomStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, margin: "0 2px", padding: "1px 7px", borderRadius: 8, fontSize: 14, fontWeight: 650, lineHeight: "22px", userSelect: "all" };
const mentionAtomFocusedStyle: CSSProperties = { background: "var(--color-background-subtle, #f2f3f5)", outline: "2px solid color-mix(in srgb, var(--color-foreground-accent, #3676e8) 28%, transparent)", outlineOffset: 1 };
const mentionAtomIconStyle: CSSProperties = { display: "inline-grid", width: 16, height: 16, placeItems: "center", borderRadius: 4, fontWeight: 700 };
const suggestionSurfaceStyle: CSSProperties = { boxSizing: "border-box", display: "grid", width: 360, maxWidth: "min(440px, calc(100vw - 24px))", padding: 4, border: "1px solid var(--color-border-subtle, #e4e6ea)", borderRadius: 14, background: "var(--color-background-canvas, #fff)", boxShadow: "var(--shadow-overlay, 0 12px 36px rgb(0 0 0 / 14%))" };
const suggestionGroupLabelStyle: CSSProperties = { padding: "8px 10px 6px", color: "var(--color-foreground-muted, #73777f)", fontSize: 12, fontWeight: 600 };
const suggestionScrollStyle: CSSProperties = { display: "grid", maxHeight: 384, overflowY: "auto" };
const suggestionRowStyle: CSSProperties = { display: "flex", width: "100%", alignItems: "center", gap: 10, padding: "9px 10px", border: 0, borderRadius: 10, background: "transparent", color: "var(--color-foreground-strong, #202124)", textAlign: "left", cursor: "pointer" };
const suggestionRowActiveStyle: CSSProperties = { background: "var(--color-background-subtle, #f2f3f5)", outline: "2px solid color-mix(in srgb, var(--color-foreground-accent, #3676e8) 20%, transparent)", outlineOffset: -2 };
const suggestionRowDisabledStyle: CSSProperties = { cursor: "not-allowed", opacity: 0.56 };
const suggestionIconStyle: CSSProperties = { width: 32, height: 32, flex: "0 0 32px", borderRadius: 9, objectFit: "cover" };
const suggestionIconFallbackStyle: CSSProperties = { display: "grid", width: 32, height: 32, flex: "0 0 32px", placeItems: "center", borderRadius: 9, background: "var(--color-background-accent-subtle, #edf3ff)", color: "var(--color-foreground-accent, #3676e8)", fontWeight: 700 };
const suggestionTextStyle: CSSProperties = { display: "grid", minWidth: 0, flex: 1 };
const suggestionTitleStyle: CSSProperties = { overflow: "hidden", fontSize: 13, textOverflow: "ellipsis", whiteSpace: "nowrap" };
const suggestionDescriptionStyle: CSSProperties = { marginTop: 2, overflow: "hidden", color: "var(--color-foreground-muted, #73777f)", fontSize: 11, textOverflow: "ellipsis", whiteSpace: "nowrap" };
