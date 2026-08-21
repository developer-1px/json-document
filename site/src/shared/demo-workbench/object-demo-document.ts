import type { ObjectDocument } from "@interactive-os/json-document-editing";

// These colors are editable document data, not design-system presentation values.
export const objectDemoColors = ["#de6d55", "#60786f", "#c4a35a", "#4d6a8a"] as const;

export const initialObjectDemoDocument: ObjectDocument = {
  objects: [
    { id: "note", label: "Note", x: 24, y: 24, width: 120, height: 72, color: "#de6d55" },
    { id: "card", label: "Card", x: 168, y: 40, width: 120, height: 72, color: "#60786f" },
    { id: "chip", label: "Chip", x: 96, y: 136, width: 120, height: 72, color: "#c4a35a" },
  ],
};
