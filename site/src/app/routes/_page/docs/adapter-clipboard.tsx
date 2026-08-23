import { createFileRoute } from "@tanstack/react-router";
import { AdapterClipboardDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/adapter-clipboard")({ component: AdapterClipboardDocsRoute });
