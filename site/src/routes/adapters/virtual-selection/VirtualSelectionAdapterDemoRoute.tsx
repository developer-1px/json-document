import { CatalogDemoPage } from "../../../shared/ui/catalog-demo-page";
import { VirtualSelectionAdapterLab } from "./VirtualSelectionAdapterLab";

const connectionCode = `const transcriptRef = useVirtualSelectionScope({
  activation: "fallback",
  readAllText: () => conversationItemsPlainText(items),
});

return <section ref={transcriptRef}>{visibleItems.map(renderItem)}</section>;`;

export function VirtualSelectionAdapterDemoRoute() {
  return (
    <CatalogDemoPage
      connectionCode={{ language: "tsx", source: connectionCode }}
      connectionDescription="The Web coordinator owns native selection and copy events. React owns only registration lifecycle; the Host provides complete model text and the virtualizer keeps scroll ownership."
      description="Official virtual selection adapter. A native Range represents the mounted window while copy writes the complete model-backed plain text."
      illustration="cursor"
      install="npm i @interactive-os/json-document-web @interactive-os/json-document-react"
      title="Virtual Selection Adapter"
    >
      <VirtualSelectionAdapterLab />
    </CatalogDemoPage>
  );
}
