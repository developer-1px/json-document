import { createFileRoute } from "@tanstack/react-router";
import { AdapterKeyboardDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/adapter-keyboard")({ component: AdapterKeyboardDocsRoute });
