import { createFileRoute } from "@tanstack/react-router";
import { ObjectDemoRoute } from "../../../../routes/object-demo/ObjectDemoRoute";

export const Route = createFileRoute("/_page/demo/object")({
  component: ObjectDemoRoute,
});
