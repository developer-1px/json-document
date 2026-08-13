import { createFileRoute } from "@tanstack/react-router";
import { ExampleWorkbenchRoute } from "../../../../routes/example-workbench/ExampleWorkbenchRoute";

export const Route = createFileRoute("/_page/examples/document")({
  component: ExampleWorkbenchRoute,
});
