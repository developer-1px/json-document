import { KeyboardAdapterLab } from "./KeyboardAdapterLab";
import { CatalogDemoPage } from "../../../shared/ui/catalog-demo-page";

const connectionCode = `const keyboard = createWebKeyboardAdapter();

surface.addEventListener("keydown", (event) => {
  const command = keyboard.resolve(event);
  // Host maps the command through Topology into an existing Intent.
});`;

export function KeyboardAdapterDemoRoute() {
  return (
    <CatalogDemoPage
      connectionCode={{ language: "typescript", source: connectionCode }}
      connectionDescription="The official keyboard adapter owns the keymap. The host maps the resolved command through Topology into the same public Intent, Clipboard, and History doors."
      description="Official keyboard adapter. Conventional KeyboardEvent chords become semantic commands, then existing editing doors."
      illustration="peek"
      install="npm i @interactive-os/json-document-web"
      title="Keyboard Adapter"
    >
      <KeyboardAdapterLab />
    </CatalogDemoPage>
  );
}
