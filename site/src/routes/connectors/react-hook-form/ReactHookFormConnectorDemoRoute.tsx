import { CodeBlock, InlineCode } from "../../../shared/ui/code-block";
import { PageIntro } from "../../../shared/ui/primitives";
import { classes, ui } from "../../../shared/ui/styles";
import { ReactHookFormConnectorLab } from "./ReactHookFormConnectorLab";

const connectorCode = `const binding = useReactHookFormConnector<ProfileForm>(document, {
  errorName: ({ pointer }) => pointer === "/profile/name"
    ? "profile.name"
    : "root.canonical",
});

return <form onSubmit={binding.submit}>…</form>;`;

export function ReactHookFormConnectorDemoRoute() {
  return (
    <main className={classes("px-4 py-8 lg:px-8", ui.frame.page)}>
      <div className={ui.frame.content}>
        <header className={classes("mb-6 grid gap-4 pb-5 lg:grid-cols-[minmax(0,1fr)_30rem]", ui.frame.header)}>
          <PageIntro title="React Hook Form Connector">
            React Hook Form owns field lifecycle; json-document owns canonical commits, validation, and history.
          </PageIntro>
          <div className={ui.code.install}>
            <div className={ui.text.label}>Install</div>
            <InlineCode className="mt-2 block overflow-x-auto whitespace-nowrap" prompt>npm i @interactive-os/json-document-react-hook-form react-hook-form</InlineCode>
          </div>
        </header>

        <ReactHookFormConnectorLab />

        <section aria-label="Minimal React Hook Form connector code" className={classes("mt-4 pt-4", ui.surface.sectionDivider)}>
          <h2 className={classes("mb-2 mt-0", ui.text.heading)}>The connection</h2>
          <CodeBlock language="tsx" size="content" source={connectorCode} />
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            Invalid submits keep the draft visible and map canonical JSON Pointer diagnostics to host fields. Undo, redo, and external canonical changes reset the form to the source of truth.
          </p>
        </section>
      </div>
    </main>
  );
}
