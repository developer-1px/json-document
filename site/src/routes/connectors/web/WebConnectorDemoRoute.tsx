import { WebConnectorLab } from "./WebConnectorLab";
import { ConnectorDemoPage } from "../ConnectorDemoPage";

const connectorCode = `const keyboard = createWebKeyboardAdapter();
const clipboard = createWebClipboardBinding({
  codec: documentClipboardCodec,
  read: () => editor.copy(),
  paste: (payload) => editor.dispatch({
    type: "clipboard.paste",
    clipboard: payload,
  }),
});

surface.addEventListener("keydown", (event) => {
  const command = keyboard.resolve(event);
});
surface.addEventListener("copy", (event) => clipboard.copy(event));
surface.addEventListener("paste", (event) => clipboard.paste(event));`;

export function WebConnectorDemoRoute() {
  return (
    <ConnectorDemoPage
      connectionCode={{ language: "typescript", source: connectorCode }}
      connectionDescription="The official keyboard adapter owns the keymap. The host maps the resolved command through Topology into the same public Intent, Clipboard, and History doors used by other surfaces."
      description="Official Web adapters translate KeyboardEvent chords, ClipboardEvent, text-control input, and modifier keys into public editing and selection contracts."
      illustration="peek"
      install="npm i @interactive-os/json-document-web"
      title="Web Platform Connector"
    >
      <WebConnectorLab />
    </ConnectorDemoPage>
  );
}
