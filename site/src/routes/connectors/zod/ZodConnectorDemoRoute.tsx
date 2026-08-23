import { ZodDatabaseLab } from "./ZodAdminLab";
import { InlineCode } from "../../../shared/ui/code-block";
import { ConnectorDemoPage } from "../ConnectorDemoPage";

const databaseCode = `<DatabaseHand
  schema={schema}
  records={records}
  onRecordsChange={setRecords}
/>`;

export function ZodConnectorDemoRoute() {
  return (
    <ConnectorDemoPage
      connectionCode={{ language: "typescript", source: databaseCode }}
      connectionDescription={(
        <>The table is the workspace. <InlineCode>DatabaseHand</InlineCode> turns a Zod object and records into a complete editable surface.</>
      )}
      description="A Zod object schema and record array become a complete Database workspace."
      illustration="sleep"
      install="npm i @interactive-os/json-document-database zod"
      title="Zod Connector"
    >
      <ZodDatabaseLab />
    </ConnectorDemoPage>
  );
}
