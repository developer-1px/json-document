import { createFileRoute } from "@tanstack/react-router";
import { DocumentWidgetRoute } from "../../../../routes/widgets/DocumentWidgetRoute";

export const Route = createFileRoute("/_page/widgets/document")({
  component: DocumentWidgetRoute,
});
