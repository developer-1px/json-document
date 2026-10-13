import { Check, Choice, Command, Field, Tabs } from "@interactive-os/json-document-ui-primitives-react";
import { assertUIComponentContent, uiComponentDocumentType, type CanvasObject, type UIDesignId, type UIComponentContent } from "@interactive-os/json-document-object-document";
import { useId, type ReactNode } from "react";

export interface UIComponentInteraction {
  readonly busy: boolean;
  readonly selectedItem: number;
  readonly onAction: () => void;
  readonly onValueChange: (value: string | boolean) => void;
  readonly onSelectItem: (index: number) => void;
}

export interface UIComponentSurfaceProps {
  readonly object: Extract<CanvasObject, {kind: "embedded-document"}>;
  readonly designId?: UIDesignId;
  readonly issues?: readonly string[];
  readonly interaction?: UIComponentInteraction;
  readonly layout?: "absolute" | "flow";
}
/** Absolute editing wrapper over the same content surface used by auto-flow runtime. */
export function UIComponentView(props: UIComponentSurfaceProps) {
  const {object} = props;
  return <foreignObject x={object.x} y={object.y} width={object.width} height={object.height} data-ui-component-object={object.id}>
    <UIComponentSurface {...props} layout="absolute" />
  </foreignObject>;
}
/** Registered HTML content with intrinsic sizing. User strings remain text, never HTML or CSS. */
export function UIComponentSurface({object, designId = "clean", issues = [], interaction, layout = "flow"}: UIComponentSurfaceProps) {
  if (object.documentType !== uiComponentDocumentType) return null;
  assertUIComponentContent(object.document);
  const content = object.document;
  return <div inert={!interaction} className="ui-component" data-component={content.component} data-tone={content.tone} data-design={designId} data-layout={layout}>
    <ComponentContent text={object.label} content={content} interaction={interaction} />
    {issues.length > 0 && <p className="ui-component-binding-error" role="status">{issues.join(" ")}</p>}
  </div>;
}
function ComponentContent({ text, content, interaction }: { text: string; content: UIComponentContent; interaction: UIComponentInteraction | undefined }): ReactNode {
  const id = useId();
  const options = content.items.map((label, index) => ({ id: String(index), label }));
  switch (content.component) {
    case "heading": return <h1>{text}</h1>;
    case "text": return <p>{text}</p>;
    case "button": return <Command kind={content.tone === "accent" ? "primary" : "secondary"} disabled={!!interaction?.busy} onClick={interaction?.onAction}>{text}</Command>;
    case "input": return <label><span>{text}</span><Field label={text} value={String(content.value ?? "")} placeholder={content.detail} disabled={!!interaction?.busy} onValueChange={value => interaction?.onValueChange(value)} /></label>;
    case "textarea": return <label><span>{text}</span><Field multiline label={text} value={String(content.value ?? "")} placeholder={content.detail} disabled={!!interaction?.busy} onValueChange={value => interaction?.onValueChange(value)} /></label>;
    case "checkbox": return <label className="ui-component-check"><Check label={text} checked={content.value === true} disabled={!!interaction?.busy} onCheckedChange={value => interaction?.onValueChange(value)} /><span>{text}</span></label>;
    case "select": return <label><span>{text}</span><Choice presentation="popup" label={text} value={options.find(o => o.label === content.value)?.id ?? options[0]?.id ?? ""} options={options} disabled={!!interaction?.busy} onValueChange={value => interaction?.onValueChange(options.find(o => o.id === value)?.label ?? "")} /></label>;
    case "tabs": return <Tabs tabId={value => `${id}-tab-${value}`} panelId={value => `${id}-panel-${value}`} label={text} value={options[0]?.id ?? ""} options={options} onValueChange={() => {}} />;
    case "card": return <article><h2>{text}</h2><p>{content.detail || (content.bindings?.some(b => b.target === "detail") ? "아직 결과가 없어요. 위의 작업을 진행해 주세요." : "")}</p></article>;
    case "metric": return <section><p>{text}</p><strong>{content.detail}</strong></section>;
    case "list": return <section><h2>{text}</h2><ul>{content.items.map((item, i) => <li key={i}>{interaction && content.bindings?.some(b => b.target === "items") ? <Command disabled={interaction.busy} aria-pressed={interaction.selectedItem === i} onClick={() => interaction.onSelectItem(i)}>{item}</Command> : item}</li>)}</ul></section>;
    case "divider": return <hr />;
  }
}
