import { WebConnectorLab } from "./WebConnectorLab";
import { ConnectorDemoPage } from "../ConnectorDemoPage";

const connectorCode = `const clipboard = createWebClipboardBinding({
  codec: documentClipboardCodec,
  read: () => editor.copy(),
  paste: (payload) => editor.dispatch({
    type: "clipboard.paste",
    clipboard: payload,
  }),
});

surface.addEventListener("copy", (event) => clipboard.copy(event));
surface.addEventListener("paste", (event) => clipboard.paste(event));`;

export function WebConnectorDemoRoute() {
  return (
    <ConnectorDemoPage
      connectionCode={{ language: "typescript", source: connectorCode }}
      connectionDescription="The host owns focus, shortcuts, and accessibility. The Connector translates native events into the same public Editing calls used by other surfaces."
      description="Native ClipboardEvent, text-control input, and modifier keys translate into public editing and selection contracts."
      illustration="peek"
      install="npm i @interactive-os/json-document-web"
      title="Web Platform Connector"
    >
      <WebConnectorLab />
    </ConnectorDemoPage>
  );
}
