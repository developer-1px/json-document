/** Closed visual recipes. Rendering maps these IDs to shared tokens, never user CSS. */
export const uiDesignCatalog = [
  {id: "clean", label: "기본", description: "Clear typography and quiet surfaces."},
  {id: "soft", label: "부드럽게", description: "Muted surfaces, rounded cards and generous content spacing."},
  {id: "bold", label: "선명하게", description: "Accent headings and prominent metric values."},
] as const;
export type UIDesignId = typeof uiDesignCatalog[number]["id"];
