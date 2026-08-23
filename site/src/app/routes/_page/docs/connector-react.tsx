import { createFileRoute } from "@tanstack/react-router";
import { ConnectorReactDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/connector-react")({ component: ConnectorReactDocsRoute });
