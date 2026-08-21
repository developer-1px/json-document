import apiReferenceMarkdown from "../../../../docs/public/api.md?raw";
import clipboardMarkdown from "../../../../docs/public/clipboard.md?raw";
import affordanceMarkdown from "../../../../docs/public/affordance.md?raw";
import affordanceDragMarkdown from "../../../../docs/public/affordance-drag.md?raw";
import affordanceFoldMarkdown from "../../../../docs/public/affordance-fold.md?raw";
import affordanceHistoryMarkdown from "../../../../docs/public/affordance-history.md?raw";
import affordanceSelectMarkdown from "../../../../docs/public/affordance-select.md?raw";
import affordanceFocusMarkdown from "../../../../docs/public/affordance-focus.md?raw";
import affordanceCaretMarkdown from "../../../../docs/public/affordance-caret.md?raw";
import affordanceTypeaheadMarkdown from "../../../../docs/public/affordance-typeahead.md?raw";
import affordanceActivateMarkdown from "../../../../docs/public/affordance-activate.md?raw";
import affordanceCancelMarkdown from "../../../../docs/public/affordance-cancel.md?raw";
import affordanceDeleteMarkdown from "../../../../docs/public/affordance-delete.md?raw";
import affordanceRenameMarkdown from "../../../../docs/public/affordance-rename.md?raw";
import affordanceNudgeMarkdown from "../../../../docs/public/affordance-nudge.md?raw";
import affordanceHoverMarkdown from "../../../../docs/public/affordance-hover.md?raw";
import affordanceDoubleClickMarkdown from "../../../../docs/public/affordance-double-click.md?raw";
import affordanceTripleClickMarkdown from "../../../../docs/public/affordance-triple-click.md?raw";
import affordanceContextMenuMarkdown from "../../../../docs/public/affordance-context-menu.md?raw";
import affordanceMarqueeMarkdown from "../../../../docs/public/affordance-marquee.md?raw";
import affordanceDropMarkdown from "../../../../docs/public/affordance-drop.md?raw";
import affordanceCopyDragMarkdown from "../../../../docs/public/affordance-copy-drag.md?raw";
import affordanceResizeMarkdown from "../../../../docs/public/affordance-resize.md?raw";
import affordancePanMarkdown from "../../../../docs/public/affordance-pan.md?raw";
import affordanceScrollMarkdown from "../../../../docs/public/affordance-scroll.md?raw";
import affordanceZoomMarkdown from "../../../../docs/public/affordance-zoom.md?raw";
import affordanceSnapMarkdown from "../../../../docs/public/affordance-snap.md?raw";
import affordanceForbidMarkdown from "../../../../docs/public/affordance-forbid.md?raw";
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
import databaseMarkdown from "../../../../docs/public/database.md?raw";
import { pageDescriptor } from "../../app/page-descriptors";

function docPage(path: string, source: string) {
  return { ...pageDescriptor(path), source };
}

export const docPages = {
  overview: docPage("/docs", overviewMarkdown),
  quickstart: docPage("/docs/tutorial", quickstartMarkdown),
  adapters: docPage("/docs/adapters", adaptersMarkdown),
  affordance: docPage("/docs/affordance", affordanceMarkdown),
  affordanceSelect: docPage("/docs/affordance/select", affordanceSelectMarkdown),
  affordanceFold: docPage("/docs/affordance/fold", affordanceFoldMarkdown),
  affordanceDrag: docPage("/docs/affordance/drag", affordanceDragMarkdown),
  affordanceHistory: docPage("/docs/affordance/history", affordanceHistoryMarkdown),
  affordanceFocus: docPage("/docs/affordance/focus", affordanceFocusMarkdown),
  affordanceCaret: docPage("/docs/affordance/caret", affordanceCaretMarkdown),
  affordanceTypeahead: docPage("/docs/affordance/typeahead", affordanceTypeaheadMarkdown),
  affordanceActivate: docPage("/docs/affordance/activate", affordanceActivateMarkdown),
  affordanceCancel: docPage("/docs/affordance/cancel", affordanceCancelMarkdown),
  affordanceDelete: docPage("/docs/affordance/delete", affordanceDeleteMarkdown),
  affordanceRename: docPage("/docs/affordance/rename", affordanceRenameMarkdown),
  affordanceNudge: docPage("/docs/affordance/nudge", affordanceNudgeMarkdown),
  affordanceHover: docPage("/docs/affordance/hover", affordanceHoverMarkdown),
  affordanceDoubleClick: docPage("/docs/affordance/double-click", affordanceDoubleClickMarkdown),
  affordanceTripleClick: docPage("/docs/affordance/triple-click", affordanceTripleClickMarkdown),
  affordanceContextMenu: docPage("/docs/affordance/context-menu", affordanceContextMenuMarkdown),
  affordanceMarquee: docPage("/docs/affordance/marquee", affordanceMarqueeMarkdown),
  affordanceDrop: docPage("/docs/affordance/drop", affordanceDropMarkdown),
  affordanceCopyDrag: docPage("/docs/affordance/copy-drag", affordanceCopyDragMarkdown),
  affordanceResize: docPage("/docs/affordance/resize", affordanceResizeMarkdown),
  affordancePan: docPage("/docs/affordance/pan", affordancePanMarkdown),
  affordanceScroll: docPage("/docs/affordance/scroll", affordanceScrollMarkdown),
  affordanceZoom: docPage("/docs/affordance/zoom", affordanceZoomMarkdown),
  affordanceSnap: docPage("/docs/affordance/snap", affordanceSnapMarkdown),
  affordanceForbid: docPage("/docs/affordance/forbid", affordanceForbidMarkdown),
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
  database: docPage("/docs/database", databaseMarkdown),
  intent: docPage("/docs/intent", intentMarkdown),
  intentGuide: docPage("/docs/intent-guide", intentGuideMarkdown),
  api: docPage("/docs/api", apiReferenceMarkdown),
  topology: docPage("/docs/topology", topologyMarkdown),
  selection: docPage("/docs/selection", selectionMarkdown),
  history: docPage("/docs/history", historyMarkdown),
  clipboard: docPage("/docs/clipboard", clipboardMarkdown),
} as const;

export type DocPageId = keyof typeof docPages;
