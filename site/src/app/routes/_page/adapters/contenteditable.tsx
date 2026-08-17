import { createFileRoute } from "@tanstack/react-router";
import { ContentEditableAdapterDemoRoute } from "../../../../routes/adapters/contenteditable/ContentEditableAdapterDemoRoute";

export const Route = createFileRoute("/_page/adapters/contenteditable")({
  component: ContentEditableAdapterDemoRoute,
});
