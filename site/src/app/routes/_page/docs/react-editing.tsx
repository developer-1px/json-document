import { createFileRoute } from "@tanstack/react-router";
import { ReactEditingDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/react-editing")({
  component: ReactEditingDocsRoute,
});
