import { DocsRoute } from "./DocsRoute";

export function ArchitectureRoute() {
  return <DocsRoute pageId="architecture" />;
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
