import { CodeBlock, InlineCode } from "../../../shared/ui/code-block";
import { PageFrame, PageHeader } from "../../../shared/ui/primitives";
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
    <PageFrame>
        <PageHeader
          illustration="braces"
          title="React Hook Form Connector"
          aside={(
            <div className={ui.code.install}>
              <div className={ui.text.label}>Install</div>
              <InlineCode className="mt-2 block overflow-x-auto whitespace-nowrap" prompt>npm i @interactive-os/json-document-react-hook-form react-hook-form</InlineCode>
            </div>
          )}
        >
            React Hook Form owns field lifecycle; json-document owns canonical commits, validation, and history.
        </PageHeader>

        <ReactHookFormConnectorLab />

        <section aria-label="Minimal React Hook Form connector code" className={classes("mt-4 pt-4", ui.surface.sectionDivider)}>
          <h2 className={classes("mb-2 mt-0", ui.text.heading)}>The connection</h2>
          <CodeBlock language="tsx" size="content" source={connectorCode} />
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            Invalid submits keep the draft visible and map canonical JSON Pointer diagnostics to host fields. Undo, redo, and external canonical changes reset the form to the source of truth.
          </p>
        </section>
    </PageFrame>
  );
}
