import apiReferenceMarkdown from "../../../../docs/public/api.md?raw";
import clipboardMarkdown from "../../../../docs/public/clipboard.md?raw";
import connectorsMarkdown from "../../../../docs/public/connectors.md?raw";
import historyMarkdown from "../../../../docs/public/history.md?raw";
import overviewMarkdown from "../../../../docs/public/overview.md?raw";
import quickstartMarkdown from "../../../../docs/public/quickstart.md?raw";
import selectionMarkdown from "../../../../docs/public/selection.md?raw";
import topologyMarkdown from "../../../../docs/public/topology.md?raw";

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
  topology: {
    path: "/docs/topology",
    label: "Topology",
    title: "Topology",
    source: topologyMarkdown,
  },
  selection: {
    path: "/docs/selection",
    label: "Selection",
    title: "Selection",
    source: selectionMarkdown,
  },
  history: {
    path: "/docs/history",
    label: "History",
    title: "History",
    source: historyMarkdown,
  },
  clipboard: {
    path: "/docs/clipboard",
    label: "Clipboard",
    title: "Clipboard",
    source: clipboardMarkdown,
  },
} as const;

export type DocPageId = keyof typeof docPages;
