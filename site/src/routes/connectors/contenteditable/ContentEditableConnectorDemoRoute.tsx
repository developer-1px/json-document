import { classes, ui } from "../../../shared/ui/styles";
import { PageFrame, PageHeader } from "../../../shared/ui/primitives";
import { ContentEditableConnectorLab } from "./ContentEditableConnectorLab";

export function ContentEditableConnectorDemoRoute() {
  return (
    <PageFrame>
      <PageHeader
        illustration="peek"
        title="Contenteditable Connector"
        aside={<code className={classes("block overflow-x-auto", ui.code.inline)}>npm i @interactive-os/json-document-contenteditable</code>}
      >
        A React contenteditable root leases native input and commits the bound string through the six-member JSON Document port.
      </PageHeader>
      <ContentEditableConnectorLab />
    </PageFrame>
  );
}
