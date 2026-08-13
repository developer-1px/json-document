import { ZodAdminLab } from "./ZodAdminLab";
import { CodeBlock, InlineCode } from "../../../shared/ui/code-block";
import { PageFrame, PageHeader } from "../../../shared/ui/primitives";
import { classes, ui } from "../../../shared/ui/styles";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const adminCode = `const result = databaseDocumentFromZod(schema, records);
const editor = createDatabaseEditor(result.value);`;

export function ZodConnectorDemoRoute() {
  return (
    <PageFrame>
        <PageHeader
          illustration="sleep"
          title="Zod Admin"
          aside={(
            <div className={ui.code.install}>
              <div className={ui.text.label}>Install</div>
              <InlineCode className="mt-2 block overflow-x-auto whitespace-nowrap" prompt>npm i @interactive-os/json-document-zod zod</InlineCode>
            </div>
          )}
        >
              A Zod object schema and record array become a Database table. That table is the admin.
        </PageHeader>

        <ZodAdminLab />

        <section aria-label="Minimal Zod admin code" className={classes("mt-4 pt-4", ui.surface.sectionDivider)}>
          <h2 className={classes("mb-2 mt-0", ui.text.heading)}>Attach records</h2>
          <CodeBlock language="typescript" size="content" source={adminCode} />
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            The table is the admin. <InlineCode>databaseDocumentFromZod</InlineCode> translates a Zod object and records into a Database document. It does not describe form fields or render UI.
          </p>
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            <a href={`${basePath}/connectors/zod/validate`} className={ui.action.secondary}>Validate commits</a>
          </p>
        </section>
    </PageFrame>
  );
}
