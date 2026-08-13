import { ContentEditableConnectorLab } from "./ContentEditableConnectorLab";
import { ConnectorDemoPage } from "../ConnectorDemoPage";

const connectorCode = `const document = createJSONDocument({
  title: "Shared title",
  note: "Independent note",
});

<ContentEditable document={document} pointer="/title" />`;

export function ContentEditableConnectorDemoRoute() {
  return (
    <ConnectorDemoPage
      connectionCode={{ language: "tsx", source: connectorCode }}
      connectionDescription="The host supplies the document and string pointer. The Connector leases native input for that root and commits only the bound value; toolbar and rich-text meaning stay in the product."
      description="A React contenteditable root leases native input and commits the bound string through the public JSON Document API."
      illustration="peek"
      install="npm i @interactive-os/json-document-contenteditable"
      title="Contenteditable Connector"
    >
      <ContentEditableConnectorLab />
    </ConnectorDemoPage>
  );
}
