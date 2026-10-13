import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";
export const Route = createFileRoute("/_page/docs/api/ui-builder")({component: function UIBuilderApiRoute() { return <DocsRoute pageId="uiBuilderApi" />; }});
