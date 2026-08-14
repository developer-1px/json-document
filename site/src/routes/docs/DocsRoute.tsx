import { useMemo } from "react";
import { ActionLink } from "../../shared/ui/interactive";
import { PageFrame, PageHeader, type PetiteCatIllustration } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { MarkdownViewer, markdownHeadings } from "./MarkdownViewer";
import { docPages, type DocPageId } from "./doc-pages";

const docIllustrations: Record<DocPageId, PetiteCatIllustration> = {
  overview: "package",
  quickstart: "terminal",
  connectors: "connector",
  intent: "braces",
  intentGuide: "terminal",
  api: "patch",
  topology: "branch",
  selection: "cursor",
  history: "branch",
  clipboard: "clipboard",
  collaboration: "connector",
  collaborationReplica: "branch",
  collaborationHistory: "branch",
  collaborationText: "cursor",
  collaborationLifecycle: "package",
  collaborationApi: "braces",
  adapterContenteditable: "connector",
};

export function DocsOverviewRoute() {
  return <DocsRoute pageId="overview" />;
}

export function QuickstartRoute() {
  return <DocsRoute pageId="quickstart" />;
}

export function ConnectorDocsRoute() {
  return <DocsRoute pageId="connectors" />;
}

export function ApiReferenceRoute() {
  return <DocsRoute pageId="api" />;
}

export function CollaborationOverviewRoute() {
  return <DocsRoute pageId="collaboration" />;
}

export function CollaborationReplicaRoute() {
  return <DocsRoute pageId="collaborationReplica" />;
}

export function CollaborationHistoryRoute() {
  return <DocsRoute pageId="collaborationHistory" />;
}

export function CollaborationTextRoute() {
  return <DocsRoute pageId="collaborationText" />;
}

export function CollaborationLifecycleRoute() {
  return <DocsRoute pageId="collaborationLifecycle" />;
}

export function CollaborationApiRoute() {
  return <DocsRoute pageId="collaborationApi" />;
}

export function AdapterContenteditableRoute() {
  return <DocsRoute pageId="adapterContenteditable" />;
}

export function TopologyDocsRoute() {
  return <DocsRoute pageId="topology" />;
}

export function IntentRoute() {
  return <DocsRoute pageId="intent" />;
}

export function IntentGuideRoute() {
  return <DocsRoute pageId="intentGuide" />;
}

const demoLinks: Partial<Record<DocPageId, { readonly to: string; readonly label: string }>> = {
  selection: { to: "/demo/selection", label: "Selection Demo 열기" },
  topology: { to: "/demo/topology", label: "Topology Demo 열기" },
  clipboard: { to: "/demo/clipboard", label: "Clipboard Demo 열기" },
  history: { to: "/demo/history", label: "History Demo 열기" },
};

export function DocsRoute({ pageId }: { readonly pageId: DocPageId }) {
  const page = docPages[pageId];
  const demo = demoLinks[pageId];
  const headings = useMemo(
    () => markdownHeadings(page.source).filter((heading) => heading.level === 2),
    [page.source],
  );

  return (
    <PageFrame>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="min-w-0" data-doc-content>
          <div className="mx-auto max-w-3xl">
            <PageHeader title={page.title} illustration={docIllustrations[pageId]} />
            {demo ? (
              <div className="mb-5">
                <ActionLink to={demo.to} kind="prominent">{demo.label}</ActionLink>
              </div>
            ) : null}
            <nav aria-label="Documentation sections" className={classes("mb-5 overflow-x-auto lg:hidden", ui.text.meta)}>
              <div className="flex gap-1 whitespace-nowrap">
                {headings.map((heading) => (
                  <ActionLink
                    key={`${heading.id}-${heading.text}`}
                    href={`#${heading.id}`}
                    className={classes("px-2 py-1 no-underline", ui.text.meta)}
                  >
                    {heading.text}
                  </ActionLink>
                ))}
              </div>
            </nav>
            <MarkdownViewer source={page.source} hideTitle />
          </div>
        </div>

        <aside className={classes("hidden self-start lg:sticky lg:top-4 lg:block", ui.text.meta)}>
          <nav aria-label="On this page">
            <div className={classes("mb-2", ui.text.heading)}>On this page</div>
            <div className="grid">
              {headings.map((heading) => (
                <ActionLink
                  key={`${heading.id}-${heading.text}`}
                  href={`#${heading.id}`}
                  className={classes("px-3 py-1 no-underline", ui.surface.navigationRule, ui.text.meta)}
                >
                  {heading.text}
                </ActionLink>
              ))}
            </div>
          </nav>
        </aside>
      </div>
    </PageFrame>
  );
}
