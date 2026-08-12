import { classes, ui } from "../../../shared/ui/styles";
import { PageIntro } from "../../../shared/ui/primitives";
import { WebConnectorLab } from "./WebConnectorLab";

export function WebConnectorDemoRoute() {
  return (
    <main className={classes("px-4 py-8 lg:px-8", ui.frame.page)}>
      <div className="mx-auto max-w-6xl">
        <header className={classes("mb-7 pb-5", ui.frame.header)}>
          <PageIntro illustration="peek" title="Web Platform Connector">
            Native ClipboardEvent, text-control input, and modifier keys translate into public editing and selection contracts.
          </PageIntro>
          <code className={classes("mt-2 block overflow-x-auto", ui.code.inline)}>npm i @interactive-os/json-document-web</code>
        </header>
        <WebConnectorLab />
      </div>
    </main>
  );
}
