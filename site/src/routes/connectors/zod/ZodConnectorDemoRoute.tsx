import { ZodAdminLab } from "./ZodAdminLab";
import { InlineCode } from "../../../shared/ui/code-block";
import { ConnectorDemoPage } from "../ConnectorDemoPage";

const adminCode = `const result = databaseDocumentFromZod(schema, records);
const editor = createDatabaseEditor(result.value);`;

export function ZodConnectorDemoRoute() {
  return (
    <ConnectorDemoPage
      connectionCode={{ language: "typescript", source: adminCode }}
      connectionDescription={(
        <>The table is the admin. <InlineCode>databaseDocumentFromZod</InlineCode> translates a Zod object and records into a Database document. It does not describe form fields or render UI.</>
      )}
      description="A Zod object schema and record array become a Database table. That table is the admin."
      illustration="sleep"
      install="npm i @interactive-os/json-document-zod zod"
      title="Zod Connector"
    >
      <ZodAdminLab />
    </ConnectorDemoPage>
  );
}
