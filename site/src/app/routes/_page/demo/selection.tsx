import { createFileRoute } from "@tanstack/react-router";
import { SelectionLabRoute } from "../../../../routes/selection-lab/SelectionLabRoute";

export const Route = createFileRoute("/_page/demo/selection")({
  component: SelectionLabRoute,
});
