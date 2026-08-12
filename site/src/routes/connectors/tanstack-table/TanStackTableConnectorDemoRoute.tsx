import { TanStackTableConnectorLab } from "./TanStackTableConnectorLab";

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
    <main className="min-h-full bg-stone-50 px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 grid gap-4 border-b border-stone-200 pb-5 lg:grid-cols-[minmax(0,1fr)_28rem]">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-stone-400">Connector Live Demo</p>
            <h1 className="mb-2 mt-1 text-3xl font-semibold text-stone-950">TanStack Table Connector</h1>
            <p className="m-0 max-w-2xl text-sm leading-6 text-stone-600">
              TanStack Table v8 projects the visible grid while the Sheet editor keeps canonical JSON, rectangular selection, clipboard, and history.
            </p>
          </div>
          <div className="rounded border border-stone-200 bg-white p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Install</div>
            <code className="mt-2 block overflow-x-auto text-xs text-stone-700">npm i @interactive-os/json-document-tanstack-table @tanstack/table-core</code>
          </div>
        </header>

        <TanStackTableConnectorLab />

        <section aria-label="Minimal TanStack Table connector code" className="mt-4 rounded border border-stone-200 bg-white p-4">
          <h2 className="mb-2 mt-0 text-sm font-semibold text-stone-950">The connection</h2>
          <pre className="m-0 overflow-x-auto rounded bg-stone-950 p-3 text-xs leading-5 text-stone-100"><code>{connectorCode}</code></pre>
          <p className="mb-0 mt-3 text-xs leading-5 text-stone-500">
            TanStack owns view state and row models. The Connector translates visible stable identities into Sheet topology and editing intents.
          </p>
        </section>
      </div>
    </main>
  );
}
