import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/building-blocks")({
  component: () => <DocsRoute pageId="buildingBlocks" />,
});
