import { ZodConnectorLab } from "./ZodConnectorLab";
import { CodeBlock, InlineCode } from "../../../shared/ui/code-block";
import { PageFrame, PageHeader } from "../../../shared/ui/primitives";
import { classes, ui } from "../../../shared/ui/styles";

const connectorCode = `const validate = createZodValidator(schema);
const document = createJSONDocument(initial, { validate });`;

export function ZodConnectorDemoRoute() {
  return (
    <PageFrame>
        <PageHeader
          illustration="sleep"
          title="Zod Connector"
          aside={(
            <div className={ui.code.install}>
              <div className={ui.text.label}>Install</div>
              <InlineCode className="mt-2 block overflow-x-auto whitespace-nowrap" prompt>npm i @interactive-os/json-document-zod zod</InlineCode>
            </div>
          )}
        >
              Zod safeParse issues translated into JSON Document validation results and JSON Pointer diagnostics.
        </PageHeader>

        <ZodConnectorLab />

        <section aria-label="Minimal Zod connector code" className={classes("mt-4 pt-4", ui.surface.sectionDivider)}>
          <h2 className={classes("mb-2 mt-0", ui.text.heading)}>The connection</h2>
          <CodeBlock language="typescript" size="content" source={connectorCode} />
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            The Connector owns validation result translation only. Forms, schema-driven UI, and canonical normalization remain explicit host concerns.
          </p>
        </section>
    </PageFrame>
  );
}
