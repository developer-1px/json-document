import { TanStackTableConnectorLab } from "./TanStackTableConnectorLab";
import { CodeBlock, InlineCode } from "../../../shared/ui/code-block";
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

const webCompositionCode = `const clipboard = createWebClipboardBinding({
  codec: sheetClipboardCodec,
  read: () => binding.copy(table),
  paste: (payload) => binding.paste(table, payload),
});

surface.addEventListener("copy", (event) => clipboard.copy(event));
surface.addEventListener("paste", (event) => clipboard.paste(event));`;

export function TanStackTableConnectorDemoRoute() {
  return (
    <main className={classes("px-4 py-8 lg:px-8", ui.frame.page)}>
      <div className={ui.frame.content}>
        <header className={classes("mb-6 grid gap-4 pb-5 lg:grid-cols-[minmax(0,1fr)_28rem]", ui.frame.header)}>
          <PageIntro title="TanStack Table Connector">
              TanStack Table v8 projects the visible grid, the Web Platform Connector translates native clipboard events, and the Sheet editor keeps canonical JSON, selection, and history.
          </PageIntro>
          <div className={ui.code.install}>
            <div className={ui.text.label}>Install</div>
            <InlineCode className="mt-2 block overflow-x-auto whitespace-nowrap" prompt>npm i @interactive-os/json-document-tanstack-table @interactive-os/json-document-web @tanstack/table-core</InlineCode>
          </div>
        </header>

        <TanStackTableConnectorLab />

        <section aria-label="Minimal TanStack Table connector code" className={classes("mt-4 pt-4", ui.surface.sectionDivider)}>
          <h2 className={classes("mb-2 mt-0", ui.text.heading)}>The connection</h2>
          <CodeBlock language="typescript" size="content" source={connectorCode} />
          <CodeBlock className="mt-3" language="typescript" size="content" source={webCompositionCode} />
          <p className={classes("mb-0 mt-3", ui.text.meta)}>
            TanStack owns view state and row models. Its Connector translates visible stable identities into Sheet topology; the Web Connector independently translates native clipboard events into the same Sheet editing contract.
          </p>
        </section>
      </div>
    </main>
  );
}
