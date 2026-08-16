import { ClipboardAdapterLab } from "./ClipboardAdapterLab";
import { CatalogDemoPage } from "../../../shared/ui/catalog-demo-page";

const connectionCode = `const clipboard = createWebClipboardBinding({
  codec: documentClipboardCodec,
  read: () => editor.copy(),
  paste: (payload) => editor.dispatch({
    type: "clipboard.paste",
    clipboard: payload,
  }),
});

surface.addEventListener("copy", (event) => clipboard.copy(event));
surface.addEventListener("paste", (event) => clipboard.paste(event));`;

export function ClipboardAdapterDemoRoute() {
  return (
    <CatalogDemoPage
      connectionCode={{ language: "typescript", source: connectionCode }}
      connectionDescription="The official clipboard adapter translates native ClipboardEvent into the public copy, cut, and paste doors. The host owns the event target and when native handling remains."
      description="Official clipboard adapter. Native ClipboardEvent, text-control input, and modifier keys bind to public editing contracts."
      illustration="clipboard"
      install="npm i @interactive-os/json-document-web"
      title="Clipboard Adapter"
    >
      <ClipboardAdapterLab />
    </CatalogDemoPage>
  );
}
