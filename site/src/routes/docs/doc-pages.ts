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
import handsMarkdown from "../../../../docs/public/hands.md?raw";
import historyMarkdown from "../../../../docs/public/history.md?raw";
import intentGuideMarkdown from "../../../../docs/public/intent-guide.md?raw";
import intentMarkdown from "../../../../docs/public/intent.md?raw";
import objectMarkdown from "../../../../docs/public/object.md?raw";
import orderMarkdown from "../../../../docs/public/order.md?raw";
import overviewMarkdown from "../../../../docs/public/overview.md?raw";
import quickstartMarkdown from "../../../../docs/public/quickstart.md?raw";
import reactEditingMarkdown from "../../../../docs/public/react-editing.md?raw";
import selectionMarkdown from "../../../../docs/public/selection.md?raw";
import topologyMarkdown from "../../../../docs/public/topology.md?raw";
import treeMarkdown from "../../../../docs/public/tree.md?raw";
import { pageDescriptor } from "../../app/page-descriptors";

function docPage(path: string, source: string) {
  return { ...pageDescriptor(path), source };
}

export const docPages = {
  overview: docPage("/docs", overviewMarkdown),
  quickstart: docPage("/docs/tutorial", quickstartMarkdown),
  adapters: docPage("/docs/adapters", adaptersMarkdown),
  connectors: docPage("/docs/connectors", connectorsMarkdown),
  reactEditing: docPage("/docs/react-editing", reactEditingMarkdown),
  collaboration: docPage("/docs/collaboration", collaborationMarkdown),
  collaborationReplica: docPage("/docs/collaboration/replica", collaborationReplicaMarkdown),
  collaborationHistory: docPage("/docs/collaboration/history", collaborationHistoryMarkdown),
  collaborationText: docPage("/docs/collaboration/text", collaborationTextMarkdown),
  collaborationLease: docPage("/docs/collaboration/text/lease", collaborationLeaseMarkdown),
  collaborationLifecycle: docPage("/docs/collaboration/lifecycle", collaborationLifecycleMarkdown),
  hands: docPage("/editors", handsMarkdown),
  order: docPage("/docs/order", orderMarkdown),
  object: docPage("/docs/object", objectMarkdown),
  tree: docPage("/docs/tree", treeMarkdown),
  intent: docPage("/docs/intent", intentMarkdown),
  intentGuide: docPage("/docs/intent-guide", intentGuideMarkdown),
  api: docPage("/docs/api", apiReferenceMarkdown),
  topology: docPage("/docs/topology", topologyMarkdown),
  selection: docPage("/docs/selection", selectionMarkdown),
  history: docPage("/docs/history", historyMarkdown),
  clipboard: docPage("/docs/clipboard", clipboardMarkdown),
} as const;

export type DocPageId = keyof typeof docPages;
