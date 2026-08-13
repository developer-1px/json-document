import { ZodAdminLab } from "./ZodAdminLab";
import { ZodConnectorLab } from "./ZodConnectorLab";
import { CodeBlock, InlineCode } from "../../../shared/ui/code-block";
import { PageFrame, PageHeader } from "../../../shared/ui/primitives";
import { classes, ui } from "../../../shared/ui/styles";

const adminCode = `const result = databaseDocumentFromZod(schema, records);
const editor = createDatabaseEditor(result.value);`;

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
              Zod object schemas become a Database admin table. The same package still translates safeParse issues into JSON Pointer diagnostics.
        </PageHeader>

        <ZodAdminLab />

        <section aria-label="Minimal Zod admin code" className={classes("mt-4 pt-4", ui.surface.sectionDivider)}>
          <h2 className={classes("mb-2 mt-0", ui.text.heading)}>Attach records</h2>
          <CodeBlock language="typescript" size="content" source={adminCode} />
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            The table is the admin. <InlineCode>databaseDocumentFromZod</InlineCode> translates a Zod object and records into a Database document. It does not describe form fields or render UI.
          </p>
        </section>

        <div className={classes("mt-4 pt-4", ui.surface.sectionDivider)}>
          <ZodConnectorLab />
        </div>

        <section aria-label="Minimal Zod validator code" className={classes("mt-4 pt-4", ui.surface.sectionDivider)}>
          <h2 className={classes("mb-2 mt-0", ui.text.heading)}>Validate commits</h2>
          <CodeBlock language="typescript" size="content" source={connectorCode} />
        </section>
    </PageFrame>
  );
}
