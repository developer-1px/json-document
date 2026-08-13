import { ZodConnectorLab } from "./ZodConnectorLab";
import { ConnectorDemoPage } from "../ConnectorDemoPage";

const connectorCode = `const validate = createZodValidator(schema);
const document = createJSONDocument(initial, { validate });`;

export function ZodValidateDemoRoute() {
  return (
    <ConnectorDemoPage
      connectionCode={{ language: "typescript", source: connectorCode }}
      description="Zod safeParse issues become JSON Document validation results and JSON Pointer diagnostics."
      illustration="debug"
      install="npm i @interactive-os/json-document-zod zod"
      title="Zod Validate"
    >
      <ZodConnectorLab />
    </ConnectorDemoPage>
  );
}
