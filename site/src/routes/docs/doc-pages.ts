import apiReferenceMarkdown from "../../../../docs/public/api.md?raw";
import connectorsMarkdown from "../../../../docs/public/connectors.md?raw";
import overviewMarkdown from "../../../../docs/public/overview.md?raw";
import quickstartMarkdown from "../../../../docs/public/quickstart.md?raw";

export const docPages = {
  overview: {
    path: "/docs",
    label: "Concepts",
    title: "json-document Docs",
    source: overviewMarkdown,
  },
  quickstart: {
    path: "/docs/tutorial",
    label: "Quickstart",
    title: "작은 카드 편집기 만들기",
    source: quickstartMarkdown,
  },
  connectors: {
    path: "/docs/connectors",
    label: "Connector guide",
    title: "json-document Connectors",
    source: connectorsMarkdown,
  },
  api: {
    path: "/docs/api",
    label: "API Reference",
    title: "json-document API",
    source: apiReferenceMarkdown,
  },
} as const;

export type DocPageId = keyof typeof docPages;

export const docNavigation: ReadonlyArray<{
  readonly label: "Start" | "Core" | "Connectors";
  readonly pageIds: ReadonlyArray<DocPageId>;
}> = [
  { label: "Start", pageIds: ["quickstart"] },
  { label: "Core", pageIds: ["overview", "api"] },
  { label: "Connectors", pageIds: ["connectors"] },
];
