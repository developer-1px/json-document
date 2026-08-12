import { ReactConnectorLab } from "./ReactConnectorLab";
import { CodeBlock, InlineCode } from "../../../shared/ui/code-block";
import { PageFrame, PageHeader } from "../../../shared/ui/primitives";
import { classes, ui } from "../../../shared/ui/styles";

const connectorCode = `const editor = useDocumentEditor(initial);
const snapshot = useEditingSnapshot(editor);
const value = useJSONDocumentValue(document);`;

export function ReactConnectorDemoRoute() {
  return (
    <PageFrame>
        <PageHeader
          illustration="braces"
          title="React Connector"
          aside={(
            <div className={ui.code.install}>
              <div className={ui.text.label}>Install</div>
              <InlineCode className="mt-2 block overflow-x-auto whitespace-nowrap" prompt>npm i @interactive-os/json-document-react</InlineCode>
            </div>
          )}
        >
              React subscription and component lifecycle connected to public JSON Document and editing contracts.
        </PageHeader>

        <ReactConnectorLab />

        <section aria-label="Minimal React connector code" className={classes("mt-4 pt-4", ui.surface.sectionDivider)}>
          <h2 className={classes("mb-2 mt-0", ui.text.heading)}>The connection</h2>
          <CodeBlock language="typescript" size="content" source={connectorCode} />
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            The Connector owns React subscription and lifecycle only. Rendering and document meaning remain in the host and editing domain.
          </p>
        </section>
    </PageFrame>
  );
}
