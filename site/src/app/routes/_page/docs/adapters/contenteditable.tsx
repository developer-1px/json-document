import { createFileRoute } from "@tanstack/react-router";
import { AdapterContenteditableRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/adapters/contenteditable")({
  component: AdapterContenteditableRoute,
});
