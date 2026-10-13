import { Check, Choice, Command, Field, Tabs } from "@interactive-os/json-document-ui-primitives-react";
import { assertUIComponentContent, uiComponentDocumentType, type CanvasObject, type UIComponentContent } from "@interactive-os/json-document-object-document";
import { useId, type ReactNode } from "react";

/** Registered component projection. User strings remain text, never HTML or CSS. */
export function UIComponentView({ object }: { readonly object: Extract<CanvasObject, {kind: "embedded-document"}> }) {
  if (object.documentType !== uiComponentDocumentType) return null;
  assertUIComponentContent(object.document);
  const content = object.document;
  return <foreignObject x={object.x} y={object.y} width={object.width} height={object.height} data-ui-component-object={object.id}>
    <div inert className="ui-component" data-component={content.component} data-tone={content.tone}>
      <ComponentContent text={object.label} content={content} />
    </div>
  </foreignObject>;
}
function ComponentContent({ text, content }: { text: string; content: UIComponentContent }): ReactNode {
  const id = useId();
  const options = content.items.map((label, index) => ({ id: String(index), label }));
  switch (content.component) {
    case "heading": return <h1>{text}</h1>;
    case "text": return <p>{text}</p>;
    case "button": return <Command kind={content.tone === "accent" ? "primary" : "secondary"}>{text}</Command>;
    case "input": return <label><span>{text}</span><Field label={text} value="" placeholder={content.detail} onValueChange={() => {}} /></label>;
    case "textarea": return <label><span>{text}</span><Field multiline label={text} value="" placeholder={content.detail} onValueChange={() => {}} /></label>;
    case "checkbox": return <label className="ui-component-check"><Check label={text} checked={false} onCheckedChange={() => {}} /><span>{text}</span></label>;
    case "select": return <label><span>{text}</span><Choice presentation="popup" label={text} value={options[0]?.id ?? ""} options={options} onValueChange={() => {}} /></label>;
    case "tabs": return <Tabs tabId={value => `${id}-tab-${value}`} panelId={value => `${id}-panel-${value}`} label={text} value={options[0]?.id ?? ""} options={options} onValueChange={() => {}} />;
    case "card": return <article><h2>{text}</h2><p>{content.detail}</p></article>;
    case "metric": return <section><p>{text}</p><strong>{content.detail}</strong></section>;
    case "list": return <section><h2>{text}</h2><ul>{content.items.map((item, i) => <li key={i}>{item}</li>)}</ul></section>;
    case "divider": return <hr />;
  }
}
