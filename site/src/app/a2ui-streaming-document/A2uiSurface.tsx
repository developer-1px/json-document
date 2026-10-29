import "@interactive-os/json-document-ui-primitives-react/chat-bubble.css";
import { ChatBubble, ContentCard, DisclosureButton, contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { useId, useState, type ComponentType, type ReactNode } from "react";
import { A2UI_BASIC_CATALOG_ID } from "./basic-catalog";
import type { A2uiComponent, A2uiStreamingDocument, A2uiSurfaceDocument } from "@interactive-os/json-document-a2ui";
import { classes } from "../../shared/ui/styles";
import { A2UI_PROJECTION_ERROR_TEXT } from "./protocol-error";

type MarkdownSurface = ComponentType<{ readonly content?: string | null; readonly streaming?: boolean }>;

export function A2uiSurface({ document, markdown: Markdown, surfaceId }: { readonly document: A2uiStreamingDocument; readonly markdown: MarkdownSurface; readonly surfaceId: string }) {
  const surface = document.surfaces[surfaceId];
  if (!surface) return null;
  if (surface.catalogId === A2UI_BASIC_CATALOG_ID) return <BasicCatalogSurface markdown={Markdown} surface={surface} />;
  const components = Object.values(surface.components).filter((component) => component.id !== "root");
  return <>{components.map((component) => <HandsComponent component={component} dataModel={surface.dataModel} key={component.id} markdown={Markdown} />)}</>;
}

function BasicCatalogSurface({ markdown, surface }: { readonly markdown: MarkdownSurface; readonly surface: A2uiSurfaceDocument }) {
  const root = surface.components.root;
  if (!root && Object.keys(surface.components).length === 0) return null;
  if (!root) return <section className={basicSurfaceLayout.root} aria-label="생성된 UI" data-a2ui-surface><p className={contentPresentation.caption}>{A2UI_PROJECTION_ERROR_TEXT}</p></section>;
  const rendered = renderBasicComponent(root, surface, markdown, new Set(), "/");
  return <section className={basicSurfaceLayout.root} aria-label="생성된 UI" data-a2ui-surface>{rendered ?? <p className={contentPresentation.caption}>{A2UI_PROJECTION_ERROR_TEXT}</p>}</section>;
}

function renderBasicComponent(component: A2uiComponent, surface: A2uiSurfaceDocument, Markdown: MarkdownSurface, ancestors: ReadonlySet<string>, basePath: string): ReactNode {
  const id = component.id;
  if (id && ancestors.has(id)) return null;
  const next = new Set(ancestors);
  if (id) next.add(id);
  const children = childReferences(component.children, surface.dataModel, basePath).map((reference) => {
    const child = surface.components[reference.id];
    if (!child) return null;
    const weight = typeof child.weight === "number" && child.weight > 0 ? child.weight : undefined;
    return <span className={weight ? basicSurfaceLayout.weightedChild : basicSurfaceLayout.child} data-a2ui-child data-weighted={weight ? "true" : undefined} key={`${reference.id}:${reference.basePath}`} style={weight ? { flexGrow: weight } : undefined}>{renderBasicComponent(child, surface, Markdown, next, reference.basePath)}</span>;
  });
  const text = String(boundValue(surface.dataModel, component.text, basePath) ?? "");
  const accessibility = accessibilityProps(surface.dataModel, component.accessibility, basePath);
  const layout = classes(layoutValue(basicSurfaceLayout.justify, component.justify), layoutValue(basicSurfaceLayout.align, component.align));

  if (component.component === "Column") return <div {...accessibility} className={classes(basicSurfaceLayout.column, layout)} data-a2ui-component="Column">{children}</div>;
  if (component.component === "Row") return <div {...accessibility} className={classes(basicSurfaceLayout.row, layout)} data-a2ui-component="Row">{children}</div>;
  if (component.component === "Card") {
    const child = typeof component.child === "string" ? surface.components[component.child] : undefined;
    return <ContentCard {...accessibility} data-a2ui-component="Card">{child ? renderBasicComponent(child, surface, Markdown, next, basePath) : null}</ContentCard>;
  }
  if (component.component === "Divider") return <hr {...accessibility} className={component.axis === "vertical" ? basicSurfaceLayout.divider.vertical : basicSurfaceLayout.divider.horizontal} data-a2ui-axis={component.axis === "vertical" ? "vertical" : "horizontal"} data-a2ui-component="Divider" />;
  if (component.component === "Text") {
    const variant = typeof component.variant === "string" ? component.variant : "body";
    if (variant === "h1") return <h1 {...accessibility} className={classes(contentPresentation.title, basicSurfaceLayout.text)}>{text}</h1>;
    if (variant === "h2") return <h2 {...accessibility} className={classes(contentPresentation.heading, basicSurfaceLayout.text)}>{text}</h2>;
    if (variant === "h3") return <h3 {...accessibility} className={classes(contentPresentation.itemTitle, basicSurfaceLayout.text)}>{text}</h3>;
    if (variant === "h4") return <h4 {...accessibility} className={classes(contentPresentation.itemTitle, basicSurfaceLayout.text)}>{text}</h4>;
    if (variant === "h5") return <h5 {...accessibility} className={classes(contentPresentation.caption, basicSurfaceLayout.text)}>{text}</h5>;
    if (variant === "caption") return <small {...accessibility} className={contentPresentation.caption}>{text}</small>;
    return <div {...accessibility} className={contentPresentation.itemSummary}><Markdown content={text} /></div>;
  }
  return null;
}

function HandsComponent({ component, dataModel, markdown: Markdown }: { readonly component: A2uiComponent; readonly dataModel: unknown; readonly markdown: MarkdownSurface }) {
  const value = boundValue(dataModel, component.value);
  if (component.component === "Markdown") {
    const role = component.role === "user" ? "user" : "assistant";
    if (role === "assistant" && !String(value ?? "")) return null;
    if (role === "user") return <ChatBubble direction="outgoing" label="보낸 메시지"><Markdown content={String(value ?? "")}/></ChatBubble>;
    return <article className={`llm-agent-message ${role}`}><div role={role === "assistant" ? "status" : undefined}><Markdown content={String(value ?? "")} streaming={component.streaming === true} /></div></article>;
  }
  if (component.component === "Reasoning") return <ReasoningContent value={String(value ?? "")} />;
  if (component.component === "ToolActivity") return <article className="llm-agent-message assistant"><strong>작업</strong><p>{JSON.stringify(value)}</p></article>;
  if (component.component === "Artifact") return <article className="llm-agent-message assistant"><strong>아티팩트</strong><p>{JSON.stringify(value)}</p></article>;
  return null;
}

function childReferences(value: unknown, dataModel: unknown, basePath: string): ReadonlyArray<Readonly<{ id: string; basePath: string }>> {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map((id) => ({ id, basePath }));
  if (!value || typeof value !== "object") return [];
  const template = value as Record<string, unknown>;
  if (typeof template.componentId !== "string" || typeof template.path !== "string") return [];
  const items = boundValue(dataModel, { path: template.path }, basePath);
  if (!Array.isArray(items)) return [];
  const listPath = resolvePath(basePath, template.path);
  return items.map((_, index) => ({ id: template.componentId as string, basePath: resolvePath(listPath, String(index)) }));
}

function boundValue(dataModel: unknown, binding: unknown, basePath = "/"): unknown {
  if (!binding || typeof binding !== "object" || !("path" in binding) || typeof binding.path !== "string") return binding;
  return resolvePath(basePath, binding.path).split("/").slice(1).reduce<unknown>((value, encoded) => {
    const segment = encoded.replace(/~1/g, "/").replace(/~0/g, "~");
    return value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, segment) ? (value as Record<string, unknown>)[segment] : undefined;
  }, dataModel);
}

function layoutValue(values: Readonly<Record<string, string>>, value: unknown): string | undefined {
  return typeof value === "string" ? values[value] : undefined;
}

function accessibilityProps(dataModel: unknown, value: unknown, basePath: string): Readonly<{ "aria-label"?: string; "aria-description"?: string }> {
  if (!value || typeof value !== "object") return {};
  const accessibility = value as Record<string, unknown>;
  const label = boundValue(dataModel, accessibility.label, basePath);
  const description = boundValue(dataModel, accessibility.description, basePath);
  return {
    "aria-label": typeof label === "string" ? label : undefined,
    "aria-description": typeof description === "string" ? description : undefined,
  };
}

function resolvePath(basePath: string, path: string): string {
  if (path.startsWith("/")) return path;
  if (!path || path === ".") return basePath;
  return `${basePath === "/" ? "" : basePath.replace(/\/$/, "")}/${path}`;
}

function ReasoningContent({value}: {readonly value: string}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <section className={contentPresentation.group}>
    <DisclosureButton expanded={open} controls={id} onClick={() => setOpen(current => !current)}>생각하는 중</DisclosureButton>
    <p id={id} hidden={!open} className={contentPresentation.body}>{value}</p>
  </section>;
}

const basicSurfaceLayout = {
    root: "grid content-start items-start gap-related",
    column: "grid gap-related",
    row: "flex flex-wrap items-start gap-related",
    child: "contents",
    weightedChild: "block min-w-0 basis-0",
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      spaceBetween: "justify-between",
      spaceAround: "justify-around",
      spaceEvenly: "justify-evenly",
      stretch: "justify-stretch",
    },
    align: { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" },
    divider: {
      horizontal: " w-full border-0 border-t border-line-subtle/70",
      vertical: " min-h-6 w-0 self-stretch border-0 border-l border-line-subtle/70",
    },
    text: "m-0 tracking-tight",
  } as const;
