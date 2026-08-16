import apiReferenceMarkdown from "../../../../docs/public/api.md?raw";
import clipboardMarkdown from "../../../../docs/public/clipboard.md?raw";
import adaptersMarkdown from "../../../../docs/public/adapters.md?raw";
import collaborationMarkdown from "../../../../docs/public/collaboration.md?raw";
import collaborationHistoryMarkdown from "../../../../docs/public/collaboration-history.md?raw";
import collaborationLeaseMarkdown from "../../../../docs/public/collaboration-lease.md?raw";
import collaborationLifecycleMarkdown from "../../../../docs/public/collaboration-lifecycle.md?raw";
import collaborationReplicaMarkdown from "../../../../docs/public/collaboration-replica.md?raw";
import collaborationTextMarkdown from "../../../../docs/public/collaboration-text.md?raw";
import connectorsMarkdown from "../../../../docs/public/connectors.md?raw";
import editorsMarkdown from "../../../../docs/public/editors.md?raw";
import historyMarkdown from "../../../../docs/public/history.md?raw";
import intentGuideMarkdown from "../../../../docs/public/intent-guide.md?raw";
import intentMarkdown from "../../../../docs/public/intent.md?raw";
import objectMarkdown from "../../../../docs/public/object.md?raw";
import orderMarkdown from "../../../../docs/public/order.md?raw";
import overviewMarkdown from "../../../../docs/public/overview.md?raw";
import quickstartMarkdown from "../../../../docs/public/quickstart.md?raw";
import selectionMarkdown from "../../../../docs/public/selection.md?raw";
import topologyMarkdown from "../../../../docs/public/topology.md?raw";
import treeMarkdown from "../../../../docs/public/tree.md?raw";

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
  adapters: {
    path: "/docs/adapters",
    label: "Adapter guide",
    title: "json-document Adapters",
    source: adaptersMarkdown,
  },
  connectors: {
    path: "/docs/connectors",
    label: "Connector guide",
    title: "json-document Connectors",
    source: connectorsMarkdown,
  },
  collaboration: {
    path: "/docs/collaboration",
    label: "Collaboration",
    title: "Collaboration",
    source: collaborationMarkdown,
  },
  collaborationReplica: {
    path: "/docs/collaboration/replica",
    label: "Replica",
    title: "Replica",
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
    label: "Text",
    title: "Collaborative Text",
    source: collaborationTextMarkdown,
  },
  collaborationLease: {
    path: "/docs/collaboration/text/lease",
    label: "Contenteditable lease",
    title: "Contenteditable lease",
    source: collaborationLeaseMarkdown,
  },
  collaborationLifecycle: {
    path: "/docs/collaboration/lifecycle",
    label: "Lifecycle",
    title: "Lifecycle",
    source: collaborationLifecycleMarkdown,
  },
  editors: {
    path: "/editors",
    label: "Editors",
    title: "Editors",
    source: editorsMarkdown,
  },
  order: {
    path: "/docs/order",
    label: "Order",
    title: "Order",
    source: orderMarkdown,
  },
  object: {
    path: "/docs/object",
    label: "Object",
    title: "Object",
    source: objectMarkdown,
  },
  tree: {
    path: "/docs/tree",
    label: "Tree",
    title: "Tree",
    source: treeMarkdown,
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
} as const;

export type DocPageId = keyof typeof docPages;
