import { createFileRoute } from "@tanstack/react-router";
import { OrderDemoRoute } from "../../../../routes/order-demo/OrderDemoRoute";

export const Route = createFileRoute("/_page/demo/order")({
  component: OrderDemoRoute,
});
