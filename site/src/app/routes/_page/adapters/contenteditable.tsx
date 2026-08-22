import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { ContentEditableAdapterDemoRoute } from "../../../../routes/adapters/contenteditable/ContentEditableAdapterDemoRoute";

export const Route = createFileRoute("/_page/adapters/contenteditable")({
  component: ContentEditableAdapterDemoRoute,
  ...defineDemo({ source: "routes/adapters/contenteditable/ContentEditableAdapterDemoRoute.tsx" }),
});
