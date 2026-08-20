import { createFileRoute } from "@tanstack/react-router";
import { WidgetCatalogRoute } from "../../../../routes/widgets/WidgetCatalogRoute";

export const Route = createFileRoute("/_page/widgets/")({
  component: WidgetCatalogRoute,
});
