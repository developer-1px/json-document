import type { A2uiStreamingDocumentOptions } from "@interactive-os/json-document-a2ui";
import { A2UI_BASIC_CATALOG_ID, validateBasicCatalogComponent } from "./basic-catalog";

export const HANDS_CATALOG_ID = "https://interactive-os.dev/catalogs/hands/v1";

export const a2uiCatalogPolicy: A2uiStreamingDocumentOptions = {
  initialDataModel: { content: {}, tools: {}, artifacts: {} },
  validateComponent(component, surface) {
    if (surface.catalogId === A2UI_BASIC_CATALOG_ID) validateBasicCatalogComponent(component);
  },
};
