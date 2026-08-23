import { createFileRoute } from "@tanstack/react-router";
import { ConnectorAjvDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/connector-ajv")({ component: ConnectorAjvDocsRoute });
