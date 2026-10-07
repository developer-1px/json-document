import { createFileRoute } from "@tanstack/react-router";
import { BearApplication } from "../../../applications/bear/BearApplication";

export const Route = createFileRoute("/applications/bear")({
  component: BearApplication,
});
