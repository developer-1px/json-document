import { createFileRoute } from "@tanstack/react-router";
import { SlidesApplication } from "../../../applications/slides/SlidesApplication";
export const Route = createFileRoute("/applications/slides")({ component: SlidesApplication });
