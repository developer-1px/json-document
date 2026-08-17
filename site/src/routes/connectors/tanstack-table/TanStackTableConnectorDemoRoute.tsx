import { TanStackTableConnectorLab } from "./TanStackTableConnectorLab";
import { ConnectorDemoPage } from "../ConnectorDemoPage";

const connectorCode = `const binding = createTanStackTableConnector(document);
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
    <ConnectorDemoPage
      connectionCode={[
        { language: "typescript", source: connectorCode },
        { language: "typescript", source: webCompositionCode },
      ]}
      connectionDescription="TanStack owns view state and row models. Its Connector translates visible stable identities into Sheet topology; the Web Adapter independently translates native clipboard events into the same Sheet editing contract."
      description="TanStack Table v8 projects the visible grid, the Web Platform Adapter translates native clipboard events, and the Sheet editor keeps canonical JSON, selection, and history."
      illustration="cursor"
      install="npm i @interactive-os/json-document-tanstack-table @interactive-os/json-document-web @tanstack/table-core"
      title="TanStack Table Connector"
    >
      <TanStackTableConnectorLab />
    </ConnectorDemoPage>
  );
}
