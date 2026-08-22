import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { RichTextDemoRoute } from "../../../../routes/rich-text-demo/RichTextDemoRoute";

export const Route = createFileRoute("/_page/editing/rich-text")({
  component: RichTextDemoRoute,
  ...defineDemo({ source: "routes/rich-text-demo/RichTextDemoRoute.tsx" }),
});
