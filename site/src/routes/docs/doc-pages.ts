import apiReferenceMarkdown from "../../../../docs/public/api.md?raw";
import clipboardMarkdown from "../../../../docs/public/clipboard.md?raw";
import collaborationApiMarkdown from "../../../../docs/public/collaboration-api.md?raw";
import collaborationHistoryMarkdown from "../../../../docs/public/collaboration-history.md?raw";
import collaborationLifecycleMarkdown from "../../../../docs/public/collaboration-lifecycle.md?raw";
import collaborationMarkdown from "../../../../docs/public/collaboration.md?raw";
import collaborationReplicaMarkdown from "../../../../docs/public/collaboration-replica.md?raw";
import collaborationTextMarkdown from "../../../../docs/public/collaboration-text.md?raw";
import connectorsMarkdown from "../../../../docs/public/connectors.md?raw";
import historyMarkdown from "../../../../docs/public/history.md?raw";
import intentGuideMarkdown from "../../../../docs/public/intent-guide.md?raw";
import intentMarkdown from "../../../../docs/public/intent.md?raw";
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
    title: "작은 카드 문서 만들기",
    source: quickstartMarkdown,
  },
  connectors: {
    path: "/docs/connectors",
    label: "Connector guide",
    title: "json-document Connectors",
    source: connectorsMarkdown,
  },
  intent: {
    path: "/docs/intent",
    label: "Intent",
    title: "Intent 레퍼런스",
    source: intentMarkdown,
  },
  intentGuide: {
    path: "/docs/intent-guide",
    label: "Intent guide",
    title: "Editor와 Intent 만들기",
    source: intentGuideMarkdown,
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
  collaboration: {
    path: "/docs/collaboration",
    label: "Overview",
    title: "Collaboration",
    source: collaborationMarkdown,
  },
  collaborationReplica: {
    path: "/docs/collaboration/replica",
    label: "Replica & Sync",
    title: "Replica와 synchronization",
    source: collaborationReplicaMarkdown,
  },
  collaborationHistory: {
    path: "/docs/collaboration/history",
    label: "Collaborative History",
    title: "Collaborative History",
    source: collaborationHistoryMarkdown,
  },
  collaborationText: {
    path: "/docs/collaboration/text",
    label: "Collaborative Text",
    title: "Collaborative Text",
    source: collaborationTextMarkdown,
  },
  collaborationLifecycle: {
    path: "/docs/collaboration/lifecycle",
    label: "Checkpoints & Epochs",
    title: "Checkpoints와 Epochs",
    source: collaborationLifecycleMarkdown,
  },
  collaborationApi: {
    path: "/docs/collaboration/api",
    label: "Collaboration API",
    title: "Collaboration API",
    source: collaborationApiMarkdown,
  },
} as const;

export type DocPageId = keyof typeof docPages;
