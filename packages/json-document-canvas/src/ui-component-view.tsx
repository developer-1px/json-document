import {ContentCard, SelectableItem, contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { assertUIComponentContent, uiComponentDocumentType, type CanvasObject, type UIDesignId, type UIComponentContent } from "@interactive-os/json-document-object-document";
import { type ReactNode, type RefObject } from "react";
import type { JSONValue } from "@interactive-os/json-document";
import type { InteractionHandleEvent } from "@interactive-os/json-document-affordance";
import type { DatabaseDocument, UIBuilderCollectionProjection } from "@interactive-os/json-document-editing";
import { renderUIComponentControl } from "./ui-component-controls.js";
import { renderUIComponentFeedback } from "./ui-component-feedback.js";
import { UIComponentComposition } from "./ui-component-compositions.js";
import { UIComponentCollection } from "./ui-component-collection.js";

export interface UIComponentInteraction {
  readonly editing?: boolean | undefined;
  readonly dismissBoundary?: RefObject<HTMLElement | null> | undefined;
  readonly busy: boolean;
  readonly actionUnavailableReason?: string | undefined;
  readonly selectedItem: number;
  readonly recordIdentity?: string | undefined;
  readonly onAction: (actionId?: string) => void;
  readonly onNavigate: (pageId: string) => void;
  readonly onPropsChange: (patch: Record<string, JSONValue>) => void;
  readonly onSelectRecord: (recordId: string) => void;
  readonly onCollectionChange: (document: DatabaseDocument) => void;
  readonly onItemAction?: ((index: number) => void) | undefined;
  readonly onResize?: ((delta: number, phase: "preview" | "commit") => void) | undefined;
  readonly onHandle?: ((event: InteractionHandleEvent) => void) | undefined;
  readonly onFiles?: ((files: readonly File[]) => void) | undefined;
  readonly onAppendActivity?: ((text:string) => boolean | void) | undefined;
  readonly onValueChange: (value: string | number | boolean) => boolean | void;
  readonly onSelectItem: (index: number) => void;
}

export interface UIComponentSurfaceProps {
  readonly object: Extract<CanvasObject, {kind: "embedded-document"}>;
  readonly designId?: UIDesignId;
  readonly issues?: readonly string[];
  readonly interaction?: UIComponentInteraction | undefined;
  /** Keep visual state while removing runtime controls from editing focus/input. */
  readonly inert?: boolean;
  readonly layout?: "absolute" | "flow";
  readonly renderChildren?: ((ids: readonly string[]) => ReactNode) | undefined;
  readonly collection?: UIBuilderCollectionProjection | undefined;
}
/** Absolute editing wrapper over the same content surface used by auto-flow runtime. */
export function UIComponentView(props: UIComponentSurfaceProps) {
  const {object} = props;
  return <foreignObject x={object.x} y={object.y} width={object.width} height={object.height} data-ui-component-object={object.id}>
    <UIComponentSurface {...props} layout="absolute" />
  </foreignObject>;
}
/** Registered HTML content with intrinsic sizing. User strings remain text, never HTML or CSS. */
export function UIComponentSurface({object, designId = "clean", issues = [], interaction, inert = false, layout = "flow", renderChildren, collection}: UIComponentSurfaceProps) {
  if (object.documentType !== uiComponentDocumentType) return null;
  assertUIComponentContent(object.document);
  const content = object.document;
  return <div inert={inert || !interaction} className="ui-component" data-component={content.component} data-tone={content.tone} data-design={designId} data-layout={layout}>
    <ComponentContent text={object.label} content={content} interaction={interaction} renderChildren={renderChildren} collection={collection} />
    {issues.length > 0 && <p className="ui-component-binding-error" role="status">{issues.join(" ")}</p>}
  </div>;
}
function ComponentContent({ text, content, interaction, renderChildren, collection }: { text: string; content: UIComponentContent; interaction: UIComponentInteraction | undefined; renderChildren?: ((ids: readonly string[]) => ReactNode) | undefined; collection?: UIBuilderCollectionProjection | undefined }): ReactNode {
  const args = {text, content, interaction};
  if (!(content.component === "disclosure" && content.childIds?.length)) {
    const control = renderUIComponentControl(args);
    if (control !== undefined) return control;
  }
  const feedback = renderUIComponentFeedback(args);
  if (feedback !== undefined) return feedback;
  switch (content.component) {
    case "heading": return <h2 className={contentPresentation.heading}>{text}</h2>;
    case "text": return <p className={contentPresentation.body}>{text}</p>;
    case "card": {
      const childIds = content.childIds ?? [];
      const count = Math.max(0, Math.min(childIds.length, Math.floor(Number(content.props?.actionCount) || 0)));
      const bodyIds = count ? childIds.slice(0, -count) : childIds;
      const empty = typeof content.props?.emptyMessage === "string" && content.props.emptyMessage ? <p className={contentPresentation.caption}>{content.props.emptyMessage}</p> : undefined;
      return <ContentCard title={text || undefined} empty={empty} actions={count ? renderChildren?.(childIds.slice(-count)) : undefined}>{content.detail || bodyIds.length ? <>{content.detail && <p className={contentPresentation.body}>{content.detail}</p>}{renderChildren?.(bodyIds)}</> : undefined}</ContentCard>;
    }
    case "metric": return <section className={contentPresentation.group}><p className={contentPresentation.caption}>{text}</p><strong className={contentPresentation.value}>{content.detail}</strong></section>;
    case "list": return <section className={contentPresentation.group}><h2 className={contentPresentation.heading}>{text}</h2><ul className={contentPresentation.list}>{content.items.map((item, i) => <li key={i}>{interaction && content.bindings?.some(b => b.target === "items") ? <SelectableItem selected={interaction.selectedItem === i} disabled={interaction.busy} aria-pressed={interaction.selectedItem === i} onClick={() => interaction.onSelectItem(i)}>{item}</SelectableItem> : item}</li>)}</ul></section>;
    case "divider": return <hr className={contentPresentation.divider} />;
    default: return <UIComponentComposition {...args} renderChildren={renderChildren} collection={content.collection ? <UIComponentCollection {...args} projection={collection} renderChildren={renderChildren} /> : undefined} />;
  }
}
