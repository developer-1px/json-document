import { createFileRoute } from "@tanstack/react-router";
import { ConnectorZodValidateDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/connector-zod-validate")({ component: ConnectorZodValidateDocsRoute });
