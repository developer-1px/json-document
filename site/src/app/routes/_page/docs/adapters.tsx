import { createFileRoute } from "@tanstack/react-router";
import { AdapterDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/adapters")({
  component: AdapterDocsRoute,
});
