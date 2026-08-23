import { createFileRoute } from "@tanstack/react-router";
import { ConnectorTanStackTableDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/connector-tanstack-table")({ component: ConnectorTanStackTableDocsRoute });
