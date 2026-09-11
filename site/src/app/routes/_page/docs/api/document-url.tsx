import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";
export const Route = createFileRoute("/_page/docs/api/document-url")({component: () => <DocsRoute pageId="documentURLApi" />});
