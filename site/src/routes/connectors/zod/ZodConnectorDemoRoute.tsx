import { ZodAdminLab } from "./ZodAdminLab";
import { InlineCode } from "../../../shared/ui/code-block";
import { ConnectorDemoPage } from "../ConnectorDemoPage";

const adminCode = `<DatabaseHand
  schema={schema}
  records={records}
  onRecordsChange={setRecords}
/>`;

export function ZodConnectorDemoRoute() {
  return (
    <ConnectorDemoPage
      connectionCode={{ language: "typescript", source: adminCode }}
      connectionDescription={(
        <>The table is the admin. <InlineCode>DatabaseHand</InlineCode> turns a Zod object and records into a complete editable surface.</>
      )}
      description="A Zod object schema and record array become a Database table. That table is the admin."
      illustration="sleep"
      install="npm i @interactive-os/json-document-database zod"
      title="Zod Connector"
    >
      <ZodAdminLab />
    </ConnectorDemoPage>
  );
}
