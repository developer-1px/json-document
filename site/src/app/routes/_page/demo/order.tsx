import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { OrderDemoRoute } from "../../../../routes/order-demo/OrderDemoRoute";

export const Route = createFileRoute("/_page/demo/order")({
  ...defineDemo({ component: OrderDemoRoute, source: "routes/order-demo/OrderDemoRoute.tsx" }),
});
