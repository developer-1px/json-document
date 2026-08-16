import { createFileRoute } from "@tanstack/react-router";
import { RichTextDemoRoute } from "../../../../routes/rich-text-demo/RichTextDemoRoute";

export const Route = createFileRoute("/_page/editing/rich-text")({
  component: RichTextDemoRoute,
});
