import { createFileRoute } from "@tanstack/react-router";
import { CanvasApplication } from "../../../applications/canvas/CanvasApplication";

export const Route = createFileRoute("/applications/canvas")({ component: CanvasApplication });
