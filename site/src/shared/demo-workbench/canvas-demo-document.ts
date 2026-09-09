import type { CanvasDocument } from "@interactive-os/json-document-object-document";
import type { CanvasCreationStyle } from "@interactive-os/json-document-canvas";

export const emptyCanvasDocument: CanvasDocument = { profile: "canvas/1", width: 1280, height: 720, objects: [] };

// Persisted artwork colors are product data, not UI design tokens.
export const canvasCreationStyle: CanvasCreationStyle = { color: "#b6c8e8", textColor: "#253044", fontSize: 36, strokeWidth: 4 };

export const canvasProofDocument: CanvasDocument = {
  ...emptyCanvasDocument,
  objects: [
    { id: "title", kind: "text", x: 96, y: 96, width: 660, height: 96, label: "One slide. Your ideas.", color: "#253044", fontSize: 48 },
    { id: "rectangle", kind: "rectangle", x: 96, y: 264, width: 400, height: 240, label: "", color: "#b6c8e8" },
    { id: "ellipse", kind: "ellipse", x: 616, y: 264, width: 240, height: 240, label: "", color: "#e8bdab" },
  ],
};
