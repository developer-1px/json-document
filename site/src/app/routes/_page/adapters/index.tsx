import { createFileRoute } from "@tanstack/react-router";
import { AdapterCatalogRoute } from "../../../../routes/adapters/AdapterCatalogRoute";

export const Route = createFileRoute("/_page/adapters/")({
  component: AdapterCatalogRoute,
});
