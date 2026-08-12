import { PageIntro } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { DatabaseTableDemo } from "./DatabaseTableDemo";

export function DatabaseDemoRoute() {
  return (
    <main className={classes("px-4 py-8 lg:px-8", ui.frame.page)}>
      <div className={ui.frame.content}>
        <header className={classes("mb-6 pb-5", ui.frame.header)}>
          <PageIntro title="Database Table v1">
            One canonical database, typed property editors, persistent view configuration, structural selection, and native text leases.
          </PageIntro>
        </header>
        <DatabaseTableDemo />
      </div>
    </main>
  );
}
