/** One shared design system. Stored legacy recipes are normalized by the project reader. */
export const uiDesignCatalog = [
  {id: "clean", label: "공통", description: "Shared typography, controls and minimal content hierarchy."},
] as const;
export type UIDesignId = typeof uiDesignCatalog[number]["id"];
