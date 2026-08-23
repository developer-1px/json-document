import { createFileRoute } from "@tanstack/react-router";
import { AdapterContenteditableDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/adapter-contenteditable")({ component: AdapterContenteditableDocsRoute });
