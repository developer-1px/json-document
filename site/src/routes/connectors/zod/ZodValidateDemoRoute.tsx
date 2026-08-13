import { ZodConnectorLab } from "./ZodConnectorLab";
import { CodeBlock, InlineCode } from "../../../shared/ui/code-block";
import { PageFrame, PageHeader } from "../../../shared/ui/primitives";
import { classes, ui } from "../../../shared/ui/styles";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const connectorCode = `const validate = createZodValidator(schema);
const document = createJSONDocument(initial, { validate });`;

export function ZodValidateDemoRoute() {
  return (
    <PageFrame>
        <PageHeader
          illustration="braces"
          title="Zod Validate"
          aside={(
            <div className={ui.code.install}>
              <div className={ui.text.label}>Install</div>
              <InlineCode className="mt-2 block overflow-x-auto whitespace-nowrap" prompt>npm i @interactive-os/json-document-zod zod</InlineCode>
            </div>
          )}
        >
              Zod safeParse issues become JSON Document validation results and JSON Pointer diagnostics.
        </PageHeader>

        <ZodConnectorLab />

        <section aria-label="Minimal Zod validator code" className={classes("mt-4 pt-4", ui.surface.sectionDivider)}>
          <h2 className={classes("mb-2 mt-0", ui.text.heading)}>Validate commits</h2>
          <CodeBlock language="typescript" size="content" source={connectorCode} />
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            <a href={`${basePath}/connectors/zod`} className={ui.action.secondary}>Zod admin table</a>
          </p>
        </section>
    </PageFrame>
  );
}
