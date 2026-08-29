import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { UiPrimitivesCatalogRoute } from "../../../../routes/ui-primitives-catalog/UiPrimitivesCatalogRoute";

export const Route = createFileRoute("/_page/demo/ui-primitives")({
  component: UiPrimitivesCatalogRoute,
  ...defineDemo({ source: "routes/ui-primitives-catalog/UiPrimitivesCatalogRoute.tsx" }),
});
