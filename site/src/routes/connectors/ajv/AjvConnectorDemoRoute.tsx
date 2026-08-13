import { AjvConnectorLab } from "./AjvConnectorLab";
import { ConnectorDemoPage } from "../ConnectorDemoPage";

const connectorCode = `const validateSchema = ajv.compile(schema);
const validate = createAjvValidator(validateSchema);
const document = createJSONDocument(initial, { validate });`;

export function AjvConnectorDemoRoute() {
  return (
    <ConnectorDemoPage
      connectionCode={{ language: "typescript", source: connectorCode }}
      connectionDescription="The host owns Ajv configuration and schema compilation. The Connector validates a clone and translates only the result."
      description="Compiled Ajv validators translated into synchronous JSON Document validation and JSON Pointer diagnostics."
      illustration="debug"
      install="npm i @interactive-os/json-document-ajv ajv"
      title="Ajv Connector"
    >
      <AjvConnectorLab />
    </ConnectorDemoPage>
  );
}
