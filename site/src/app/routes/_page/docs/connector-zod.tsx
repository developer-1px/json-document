import { createFileRoute } from "@tanstack/react-router";
import { ConnectorZodDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/connector-zod")({ component: ConnectorZodDocsRoute });
