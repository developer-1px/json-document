import type { PetiteCatIllustration } from "../../shared/ui/primitives";
import { docPages, type DocPageId } from "./doc-pages";
import { DocumentationPage } from "./DocumentationPage";

const docIllustrations: Record<DocPageId, PetiteCatIllustration> = {
  overview: "package",
  documentTypes: "braces",
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
  affordanceContextual: "cursor",
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
  markdownReactApi: "patch",
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

export function DocumentTypesDocsRoute() {
  return <DocsRoute pageId="documentTypes" />;
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
  return (
    <DocumentationPage
      title={page.heading ?? page.label}
      source={page.source}
      illustration={docIllustrations[pageId]}
    />
  );
}
