import { classes, ui } from "../../../shared/ui/styles";
import { PageFrame, PageHeader } from "../../../shared/ui/primitives";
import { WebConnectorLab } from "./WebConnectorLab";

export function WebConnectorDemoRoute() {
  return (
    <PageFrame>
        <PageHeader
          illustration="peek"
          title="Web Platform Connector"
          aside={<code className={classes("block overflow-x-auto", ui.code.inline)}>npm i @interactive-os/json-document-web</code>}
        >
            Native ClipboardEvent, text-control input, and modifier keys translate into public editing and selection contracts.
        </PageHeader>
        <WebConnectorLab />
    </PageFrame>
  );
}
