import { CatalogDemoPage } from "../../../shared/ui/catalog-demo-page";
import { InteractionHandleLab } from "./InteractionHandleLab";

const connectionCode = `const descriptor = {
  kind: "resize",
  edge: "se",
  cursor: { idle: "nwse-resize" },
} satisfies ResizeHandleDescriptor;

<ResizeHandle
  label="Resize object"
  orientation="horizontal"
  descriptor={descriptor}
  onResize={(delta, phase) => applyResize(delta, phase)}
/>;`;

export function InteractionHandleDemoRoute() {
  return (
    <CatalogDemoPage
      connectionCode={{ language: "typescript", source: connectionCode }}
      connectionDescription="Affordance owns handle meaning, axis-aware delta, cursor, and lifecycle. React binds that contract to Web pointer capture; the product maps committed deltas into its own Intent."
      description="DragHandle, ResizeHandle, and ControlHandle share one typed descriptor and start, preview, commit, or cancel lifecycle."
      illustration="cursor"
      install="npm i @interactive-os/json-document-affordance @interactive-os/json-document-ui-primitives-react"
      title="Interaction Handles"
    >
      <InteractionHandleLab />
    </CatalogDemoPage>
  );
}
