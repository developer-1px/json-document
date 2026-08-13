import { createFileRoute } from "@tanstack/react-router";
import { ApiReferenceRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/api")({
  component: ApiReferenceRoute,
});
