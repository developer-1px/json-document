import type { A2uiComponent, A2uiStreamingDocument } from "./a2ui-streaming-document";
import type { ComponentType } from "react";

type MarkdownSurface = ComponentType<{ readonly content?: string | null; readonly streaming?: boolean }>;

export function A2uiSurface({ document, markdown: Markdown, surfaceId }: { readonly document: A2uiStreamingDocument; readonly markdown: MarkdownSurface; readonly surfaceId: string }) {
  const surface = document.surfaces[surfaceId];
  if (!surface) return null;
  const components = Object.values(surface.components).filter((component) => component.id !== "root");
  return <>{components.map((component) => <A2uiComponentView component={component} dataModel={surface.dataModel} key={component.id} markdown={Markdown} />)}</>;
}

function A2uiComponentView({ component, dataModel, markdown: Markdown }: { readonly component: A2uiComponent; readonly dataModel: unknown; readonly markdown: MarkdownSurface }) {
  const value = boundValue(dataModel, component.value);
  if (component.component === "Markdown") {
    const role = component.role === "user" ? "user" : "assistant";
    return <article className={`llm-agent-message ${role}`}>
      <div role={role === "assistant" ? "status" : undefined}>
        <Markdown content={String(value ?? "")} streaming={component.streaming === true} />
      </div>
    </article>;
  }
  if (component.component === "Reasoning") return <details className="llm-agent-message assistant"><summary>생각하는 중</summary><p>{String(value ?? "")}</p></details>;
  if (component.component === "ToolActivity") return <article className="llm-agent-message assistant"><strong>작업</strong><p>{JSON.stringify(value)}</p></article>;
  if (component.component === "Artifact") return <article className="llm-agent-message assistant"><strong>아티팩트</strong><p>{JSON.stringify(value)}</p></article>;
  return null;
}

function boundValue(dataModel: unknown, binding: unknown): unknown {
  if (!binding || typeof binding !== "object" || !("path" in binding) || typeof binding.path !== "string") return binding;
  return binding.path.split("/").slice(1).reduce<unknown>((value, segment) => value && typeof value === "object" ? (value as Record<string, unknown>)[segment] : undefined, dataModel);
}
