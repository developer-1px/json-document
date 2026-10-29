import type { CanvasDocument } from "@interactive-os/json-document-object-document";
import type { CanvasCreationStyle } from "@interactive-os/json-document-canvas";

export const emptyCanvasDocument: CanvasDocument = { profile: "canvas/1", width: 1280, height: 720, objects: [] };

// Persisted artwork colors are product data, not UI design tokens.
export const canvasCreationStyle: CanvasCreationStyle = { color: "#b6c8e8", textColor: "#253044", stickyNoteColor: "#fff2a8", fontSize: 36, strokeWidth: 4 };

export const canvasProofDocument: CanvasDocument = {
  ...emptyCanvasDocument,
  objects: [
    { id: "title", kind: "text", x: 96, y: 96, width: 660, height: 96, label: "One slide. Your ideas.", color: "#253044", fontSize: 48 },
    { id: "rectangle", kind: "rectangle", x: 96, y: 264, width: 400, height: 240, label: "도형 안에도\n생각을 적어보세요", color: "#b6c8e8", fontSize: 32 },
    { id: "ellipse", kind: "ellipse", x: 560, y: 264, width: 240, height: 240, label: "더블클릭\n편집", color: "#e8bdab" },
    { id: "note", kind: "sticky-note", x: 880, y: 264, width: 240, height: 240, label: "작은 아이디어를\n한 장에", color: "#fff2a8", fontSize: 28 },
  ],
};

// Authored HTML/CSS artwork fixture, independent of the editor UI theme.
export const canvasHTMLProofSource = '<style>body{font-family:system-ui;background:linear-gradient(120deg,#163857,#2563eb);color:white;padding:20px;box-sizing:border-box}h1{font-size:22px;margin:0}p{font-size:14px}</style><h1 data-node-id="title">HTML + CSS</h1><p data-node-id="hint">더블클릭으로 소스 편집</p>';
