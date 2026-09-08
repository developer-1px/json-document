import { KeyboardAdapterLab } from "./KeyboardAdapterLab";
import { CatalogDemoPage } from "../../../shared/ui/catalog-demo-page";

const connectionCode = `const keyboard = createWebKeyboardAdapter<ProductCommand>({
  keymap: { g: { type: "open-command-palette" } },
  defaults: false,
});

surface.addEventListener("keydown", (event) => {
  const command = keyboard.resolve(event);
  // Host maps the command through Topology into an existing Intent.
});`;

export function KeyboardAdapterDemoRoute() {
  return (
    <CatalogDemoPage
      connectionCode={{ language: "typescript", source: connectionCode }}
      connectionDescription="The official keyboard adapter owns default and product semantic keymaps. The host maps resolved commands through Topology into existing Intent, Clipboard, and History doors."
      description="Official keyboard adapter. Conventional and product KeyboardEvent chords become typed semantic commands, then existing editing doors. Press G to inspect a product command."
      illustration="peek"
      install="npm i @interactive-os/json-document-web"
      title="Keyboard Adapter"
    >
      <KeyboardAdapterLab />
    </CatalogDemoPage>
  );
}
