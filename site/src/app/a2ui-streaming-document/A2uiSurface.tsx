import type { ComponentType, ReactNode } from "react";
import { A2UI_BASIC_CATALOG_ID } from "./basic-catalog";
import type { A2uiComponent, A2uiStreamingDocument, A2uiSurfaceDocument } from "./a2ui-streaming-document";
import { classes, ui } from "../../shared/ui/styles";

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
  if (!root) return null;
  return <section className={ui.a2ui.root} aria-label="생성된 UI" data-a2ui-surface>{renderBasicComponent(root, surface, markdown, new Set())}</section>;
}

function renderBasicComponent(component: A2uiComponent, surface: A2uiSurfaceDocument, Markdown: MarkdownSurface, ancestors: ReadonlySet<string>): ReactNode {
  const id = component.id;
  if (id && ancestors.has(id)) return null;
  const next = new Set(ancestors);
  if (id) next.add(id);
  const children = childIds(component.children).map((childId) => {
    const child = surface.components[childId];
    if (!child) return null;
    const weight = typeof child.weight === "number" && child.weight > 0 ? child.weight : undefined;
    return <span className={weight ? ui.a2ui.weightedChild : ui.a2ui.child} data-a2ui-child data-weighted={weight ? "true" : undefined} key={childId} style={weight ? { flexGrow: weight } : undefined}>{renderBasicComponent(child, surface, Markdown, next)}</span>;
  });
  const text = String(boundValue(surface.dataModel, component.text) ?? "");

  if (component.component === "Column") return <div className={ui.a2ui.column} data-a2ui-component="Column">{children}</div>;
  if (component.component === "Row") return <div className={ui.a2ui.row} data-a2ui-component="Row">{children}</div>;
  if (component.component === "Card") {
    const child = typeof component.child === "string" ? surface.components[component.child] : undefined;
    return <section className={classes(ui.surface.raised, ui.a2ui.card)} data-a2ui-component="Card">{child ? renderBasicComponent(child, surface, Markdown, next) : null}</section>;
  }
  if (component.component === "Divider") return <hr className={ui.a2ui.divider} data-a2ui-component="Divider" />;
  if (component.component === "Text") {
    const variant = typeof component.variant === "string" ? component.variant : "body";
    if (variant === "h1") return <h1 className={classes(ui.text.title, ui.a2ui.text)}>{text}</h1>;
    if (variant === "h2") return <h2 className={classes(ui.text.heading, ui.a2ui.text)}>{text}</h2>;
    if (variant === "h3") return <h3 className={classes(ui.text.heading, ui.a2ui.text)}>{text}</h3>;
    if (variant === "h4") return <h4 className={classes(ui.text.label, ui.a2ui.text)}>{text}</h4>;
    if (variant === "h5") return <h5 className={classes(ui.text.label, ui.a2ui.text)}>{text}</h5>;
    if (variant === "caption") return <small className={ui.text.meta}>{text}</small>;
    return <div className={ui.text.body}><Markdown content={text} /></div>;
  }
  return null;
}

function HandsComponent({ component, dataModel, markdown: Markdown }: { readonly component: A2uiComponent; readonly dataModel: unknown; readonly markdown: MarkdownSurface }) {
  const value = boundValue(dataModel, component.value);
  if (component.component === "Markdown") {
    const role = component.role === "user" ? "user" : "assistant";
    if (role === "assistant" && !String(value ?? "")) return null;
    return <article className={`llm-agent-message ${role}`}><div role={role === "assistant" ? "status" : undefined}><Markdown content={String(value ?? "")} streaming={component.streaming === true} /></div></article>;
  }
  if (component.component === "Reasoning") return <details className="llm-agent-message assistant"><summary>생각하는 중</summary><p>{String(value ?? "")}</p></details>;
  if (component.component === "ToolActivity") return <article className="llm-agent-message assistant"><strong>작업</strong><p>{JSON.stringify(value)}</p></article>;
  if (component.component === "Artifact") return <article className="llm-agent-message assistant"><strong>아티팩트</strong><p>{JSON.stringify(value)}</p></article>;
  return null;
}

function childIds(value: unknown): ReadonlyArray<string> {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function boundValue(dataModel: unknown, binding: unknown): unknown {
  if (!binding || typeof binding !== "object" || !("path" in binding) || typeof binding.path !== "string") return binding;
  return binding.path.split("/").slice(1).reduce<unknown>((value, segment) => value && typeof value === "object" ? (value as Record<string, unknown>)[segment] : undefined, dataModel);
}
