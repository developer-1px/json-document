import { createFileRoute } from "@tanstack/react-router";
import { ContentEditableConnectorDemoRoute } from "../../../../routes/connectors/contenteditable/ContentEditableConnectorDemoRoute";

export const Route = createFileRoute("/_page/adapters/contenteditable")({
  component: ContentEditableConnectorDemoRoute,
});
