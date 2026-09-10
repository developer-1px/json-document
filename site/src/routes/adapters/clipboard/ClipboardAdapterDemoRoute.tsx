import { ClipboardAdapterLab } from "./ClipboardAdapterLab";
import { CatalogDemoPage } from "../../../shared/ui/catalog-demo-page";

const connectionCode = `import { createWebClipboardSurface, documentClipboardCodec } from "@interactive-os/json-document-web";

const clipboardSurface = createWebClipboardSurface({
  codec: documentClipboardCodec,
  read: () => editor.copy(),
  paste: (payload) => editor.dispatch({
    type: "clipboard.paste",
    clipboard: payload,
  }),
  onResult: (result) => setAnnouncement(messageFor(result)),
});

return <section {...clipboardSurface} />;`;

export function ClipboardAdapterDemoRoute() {
  return (
    <CatalogDemoPage
      connectionCode={{ language: "typescript", source: connectionCode }}
      connectionDescription="The official clipboard adapter translates native ClipboardEvent into the public copy, cut, and paste doors. The Web surface routes the editing target before preparing content and preserves nested native editors."
      description="Official clipboard adapter. Native ClipboardEvent, text-control input, and modifier keys bind to public editing contracts."
      illustration="clipboard"
      install="npm i @interactive-os/json-document-web"
      title="Clipboard Adapter"
    >
      <ClipboardAdapterLab />
    </CatalogDemoPage>
  );
}
