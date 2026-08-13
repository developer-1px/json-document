import { AjvConnectorLab } from "./AjvConnectorLab";
import { CodeBlock, InlineCode } from "../../../shared/ui/code-block";
import { PageFrame, PageHeader } from "../../../shared/ui/primitives";
import { classes, ui } from "../../../shared/ui/styles";

const connectorCode = `const validateSchema = ajv.compile(schema);
const validate = createAjvValidator(validateSchema);
const document = createJSONDocument(initial, { validate });`;

export function AjvConnectorDemoRoute() {
  return (
    <PageFrame>
      <PageHeader
        illustration="debug"
        title="Ajv Connector"
        aside={(
          <div className={ui.code.install}>
            <div className={ui.text.label}>Install</div>
            <InlineCode className="mt-2 block overflow-x-auto whitespace-nowrap" prompt>npm i @interactive-os/json-document-ajv ajv</InlineCode>
          </div>
        )}
      >
        Compiled Ajv validators translated into synchronous JSON Document validation and JSON Pointer diagnostics.
      </PageHeader>

      <AjvConnectorLab />

      <section aria-label="Minimal Ajv connector code" className={classes("mt-4 pt-4", ui.surface.sectionDivider)}>
        <h2 className={classes("mb-2 mt-0", ui.text.heading)}>The connection</h2>
        <CodeBlock language="typescript" size="content" source={connectorCode} />
        <p className={classes("mb-0 mt-3", ui.text.meta)}>
          The host owns Ajv configuration and schema compilation. The Connector validates a clone and translates only the result.
        </p>
      </section>
    </PageFrame>
  );
}
