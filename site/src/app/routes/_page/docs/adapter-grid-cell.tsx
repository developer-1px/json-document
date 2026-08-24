import { createFileRoute } from "@tanstack/react-router";
import { AdapterGridCellDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/adapter-grid-cell")({ component: AdapterGridCellDocsRoute });
