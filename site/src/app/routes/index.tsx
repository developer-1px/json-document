import { createFileRoute } from "@tanstack/react-router";
import { HomeRoute } from "../../routes/home/HomeRoute";

export const Route = createFileRoute("/")({
  component: HomeRoute,
});
