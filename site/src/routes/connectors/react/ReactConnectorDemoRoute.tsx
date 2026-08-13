import { ReactConnectorLab } from "./ReactConnectorLab";
import { ConnectorDemoPage } from "../ConnectorDemoPage";

const connectorCode = `const editor = useDocumentEditor(initial);
const snapshot = useEditingSnapshot(editor);
const value = useReactConnector(document);`;

export function ReactConnectorDemoRoute() {
  return (
    <ConnectorDemoPage
      connectionCode={{ language: "typescript", source: connectorCode }}
      connectionDescription="The Connector owns React subscription and lifecycle only. Rendering and document meaning remain in the host and editing domain."
      description="React subscription and component lifecycle connected to public JSON Document and editing contracts."
      illustration="braces"
      install="npm i @interactive-os/json-document-react"
      title="React Connector"
    >
      <ReactConnectorLab />
    </ConnectorDemoPage>
  );
}
