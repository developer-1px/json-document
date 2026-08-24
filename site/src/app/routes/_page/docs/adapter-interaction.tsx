import { createFileRoute } from "@tanstack/react-router";
import { AdapterInteractionDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/adapter-interaction")({ component: AdapterInteractionDocsRoute });
