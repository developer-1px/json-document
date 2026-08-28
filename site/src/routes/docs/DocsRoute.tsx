import { useMemo } from "react";
import { ActionLink } from "../../shared/ui/interactive";
import { PageFrame, PageHeader, type PetiteCatIllustration } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { MarkdownViewer, markdownHeadings } from "./MarkdownViewer";
import { docPages, type DocPageId } from "./doc-pages";

const docIllustrations: Record<DocPageId, PetiteCatIllustration> = {
  overview: "package",
  adapters: "peek",
  adapterKeyboard: "terminal",
  adapterGridCell: "database",
  adapterInteraction: "cursor",
  adapterClipboard: "clipboard",
  adapterVirtualSelection: "cursor",
  adapterContenteditable: "cursor",
  affordance: "cursor",
  uiPrimitives: "braces",
  animation: "cursor",
  affordanceSelect: "cursor",
  affordanceFold: "branch",
  affordanceDrag: "peek",
  affordanceHistory: "clipboard",
  affordanceFocus: "cursor",
  affordanceCaret: "terminal",
  affordanceTypeahead: "braces",
  affordanceActivate: "peek",
  affordanceCancel: "debug",
  affordanceDelete: "patch",
  affordanceRename: "terminal",
  affordanceNudge: "peek",
  affordanceHover: "cursor",
  affordanceDoubleClick: "peek",
  affordanceTripleClick: "peek",
  affordanceContextMenu: "clipboard",
  affordanceMarquee: "cursor",
  affordanceDrop: "connector",
  affordanceCopyDrag: "peek",
  affordanceHandles: "cursor",
  affordanceResize: "branch",
  affordancePan: "sleep",
  affordanceScroll: "sleep",
  affordanceZoom: "peek",
  affordanceSnap: "braces",
  affordanceForbid: "debug",
  connectors: "connector",
  connectorReact: "connector",
  connectorReactHookForm: "clipboard",
  connectorAjv: "debug",
  connectorZod: "braces",
  connectorZodValidate: "patch",
  connectorTanStackTable: "database",
  reactEditing: "cursor",
  collaboration: "package",
  collaborationReplica: "debug",
  collaborationHistory: "branch",
  collaborationText: "sleep",
  collaborationLease: "connector",
  collaborationLifecycle: "peek",
  hands: "braces",
  composer: "terminal",
  mention: "cursor",
  order: "cursor",
  object: "peek",
  tree: "branch",
  database: "database",
  officialHands: "braces",
  intent: "braces",
  intentGuide: "terminal",
  api: "patch",
  jsonDocumentApi: "patch",
  selectionApi: "patch",
  editingApi: "patch",
  reactApi: "connector",
  reactHookFormApi: "connector",
  ajvApi: "connector",
  zodApi: "connector",
  tanStackTableApi: "connector",
  affordanceApi: "patch",
  uiPrimitivesApi: "patch",
  animationApi: "patch",
  databaseApi: "database",
  calendarApi: "database",
  webApi: "terminal",
  contenteditableApi: "cursor",
  richTextApi: "terminal",
  fileIntakeApi: "clipboard",
  richTextSuggestionApi: "cursor",
  richTextSuggestionReactApi: "connector",
  richTextMentionApi: "cursor",
  richTextMentionReactApi: "connector",
  composerApi: "terminal",
  composerReactApi: "connector",
  richTextWebApi: "cursor",
  richTextReactApi: "connector",
  collaborationApi: "branch",
  contenteditableCollaborationApi: "connector",
  topology: "branch",
  selection: "cursor",
  history: "branch",
  clipboard: "clipboard",
};

export function DocsOverviewRoute() {
  return <DocsRoute pageId="overview" />;
}

export function AdapterDocsRoute() {
  return <DocsRoute pageId="adapters" />;
}

export function AdapterKeyboardDocsRoute() {
  return <DocsRoute pageId="adapterKeyboard" />;
}

export function AdapterGridCellDocsRoute() {
  return <DocsRoute pageId="adapterGridCell" />;
}

export function AdapterInteractionDocsRoute() {
  return <DocsRoute pageId="adapterInteraction" />;
}

export function AdapterClipboardDocsRoute() {
  return <DocsRoute pageId="adapterClipboard" />;
}

export function AdapterVirtualSelectionDocsRoute() {
  return <DocsRoute pageId="adapterVirtualSelection" />;
}

export function AdapterContenteditableDocsRoute() {
  return <DocsRoute pageId="adapterContenteditable" />;
}

export function AffordanceDocsRoute() {
  return <DocsRoute pageId="affordance" />;
}

export function ConnectorDocsRoute() {
  return <DocsRoute pageId="connectors" />;
}

export function ConnectorReactDocsRoute() {
  return <DocsRoute pageId="connectorReact" />;
}

export function ConnectorReactHookFormDocsRoute() {
  return <DocsRoute pageId="connectorReactHookForm" />;
}

export function ConnectorAjvDocsRoute() {
  return <DocsRoute pageId="connectorAjv" />;
}

export function ConnectorZodDocsRoute() {
  return <DocsRoute pageId="connectorZod" />;
}

export function ConnectorZodValidateDocsRoute() {
  return <DocsRoute pageId="connectorZodValidate" />;
}

export function ConnectorTanStackTableDocsRoute() {
  return <DocsRoute pageId="connectorTanStackTable" />;
}

export function ApiReferenceRoute() {
  return <DocsRoute pageId="api" />;
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

export function ReactEditingDocsRoute() {
  return <DocsRoute pageId="reactEditing" />;
}

export function DocsRoute({ pageId }: { readonly pageId: DocPageId }) {
  const page = docPages[pageId];
  const headings = useMemo(
    () => markdownHeadings(page.source).filter((heading) => heading.level === 2),
    [page.source],
  );

  return (
    <PageFrame>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="min-w-0" data-doc-content>
          <div className="mx-auto max-w-3xl">
            <PageHeader title={page.heading ?? page.label} illustration={docIllustrations[pageId]} />
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
