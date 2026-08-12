import { TanStackTableConnectorLab } from "./TanStackTableConnectorLab";
import { PageIntro } from "../../../shared/ui/primitives";
import { classes, ui } from "../../../shared/ui/styles";

const connectorCode = `const binding = createTableDocumentBinding({ editor });
const table = useReactTable({
  ...binding.tableOptions,
  state: { sorting, columnFilters, columnOrder, columnVisibility },
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
});`;

export function TanStackTableConnectorDemoRoute() {
  return (
    <main className={classes("px-4 py-8 lg:px-8", ui.frame.page)}>
      <div className={ui.frame.content}>
        <header className={classes("mb-6 grid gap-4 pb-5 lg:grid-cols-[minmax(0,1fr)_28rem]", ui.frame.header)}>
          <PageIntro title="TanStack Table Connector">
              TanStack Table v8 projects the visible grid while the Sheet editor keeps canonical JSON, rectangular selection, clipboard, and history.
          </PageIntro>
          <div className={classes("p-3", ui.surface.inset)}>
            <div className={ui.text.label}>Install</div>
            <code className={classes("mt-2 block overflow-x-auto", ui.code.inline)}>npm i @interactive-os/json-document-tanstack-table @tanstack/table-core</code>
          </div>
        </header>

        <TanStackTableConnectorLab />

        <section aria-label="Minimal TanStack Table connector code" className={classes("mt-4 pt-4", ui.surface.sectionDivider)}>
          <h2 className={classes("mb-2 mt-0", ui.text.heading)}>The connection</h2>
          <pre className={classes("m-0 overflow-x-auto", ui.code.block)}><code>{connectorCode}</code></pre>
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            TanStack owns view state and row models. The Connector translates visible stable identities into Sheet topology and editing intents.
          </p>
        </section>
      </div>
    </main>
  );
}
