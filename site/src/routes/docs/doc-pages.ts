import apiReferenceMarkdown from "../../../../docs/public/api.md?raw";
import connectorsMarkdown from "../../../../docs/public/connectors.md?raw";
import overviewMarkdown from "../../../../docs/public/overview.md?raw";
import quickstartMarkdown from "../../../../docs/public/quickstart.md?raw";

export const docPages = {
  overview: {
    path: "/docs",
    label: "Why",
    title: "왜 json-document인가",
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
