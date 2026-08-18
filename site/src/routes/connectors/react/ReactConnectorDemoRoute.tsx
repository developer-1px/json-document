import { ReactConnectorLab } from "./ReactConnectorLab";
import { ConnectorDemoPage } from "../ConnectorDemoPage";

const connectorCode = `const value = useReactConnector(document);
const snapshot = useEditingSnapshot(editor);
const editing = useEditing({
  source: editor,
  selectedKeys: editor.selectedBlockIds,
  focusKey: focus?.blockId ?? null,
  textOffset: focus?.offset ?? null,
  onSelect: (blockId, mode) => editor.dispatch({ type: "selection.set", blockId, mode }),
});
const item = editing.getItem(block.id);
item.getIsSelected();
item.getIsFocus();
item.getTextOffset();`;

export function ReactConnectorDemoRoute() {
  return (
    <ConnectorDemoPage
      connectionCode={{ language: "typescript", source: connectorCode }}
      connectionDescription="Subscription follows document value. useEditing answers the object range, the focus cursor, and the text offset. Host markup and genre intents stay outside the Connector."
      description="React subscription plus the shared selection queries: range, focus, and text cursor."
      illustration="braces"
      install="npm i @interactive-os/json-document-react"
      title="React Connector"
    >
      <ReactConnectorLab />
    </ConnectorDemoPage>
  );
}
