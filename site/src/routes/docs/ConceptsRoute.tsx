import { DocsRoute } from "./DocsRoute";

export function ConceptsRoute() {
  return <DocsRoute pageId="concepts" />;
}

export function SelectionDocsRoute() {
  return <DocsRoute pageId="selection" />;
}

export function HistoryDocsRoute() {
  return <DocsRoute pageId="history" />;
}

export function ClipboardDocsRoute() {
  return <DocsRoute pageId="clipboard" />;
}
