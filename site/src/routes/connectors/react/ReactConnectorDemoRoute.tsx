import { ReactConnectorLab } from "./ReactConnectorLab";
import { PageIntro } from "../../../shared/ui/primitives";
import { classes, ui } from "../../../shared/ui/styles";

const connectorCode = `const editor = useDocumentEditor(initial);
const snapshot = useEditingSnapshot(editor);
const value = useJSONDocumentValue(document);`;

export function ReactConnectorDemoRoute() {
  return (
    <main className={classes("px-4 py-8 lg:px-8", ui.frame.page)}>
      <div className={ui.frame.content}>
        <header className={classes("mb-6 grid gap-4 pb-5 lg:grid-cols-[minmax(0,1fr)_24rem]", ui.frame.header)}>
          <PageIntro title="React Connector">
              React subscription and component lifecycle connected to public JSON Document and editing contracts.
          </PageIntro>
          <div className={classes("p-3", ui.surface.inset)}>
            <div className={ui.text.label}>Install</div>
            <code className={classes("mt-2 block overflow-x-auto", ui.code.inline)}>npm i @interactive-os/json-document-react</code>
          </div>
        </header>

        <ReactConnectorLab />

        <section aria-label="Minimal React connector code" className={classes("mt-4 pt-4", ui.surface.sectionDivider)}>
          <h2 className={classes("mb-2 mt-0", ui.text.heading)}>The connection</h2>
          <pre className={classes("m-0 overflow-x-auto", ui.code.block)}><code>{connectorCode}</code></pre>
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            The Connector owns React subscription and lifecycle only. Rendering and document meaning remain in the host and editing domain.
          </p>
        </section>
      </div>
    </main>
  );
}
