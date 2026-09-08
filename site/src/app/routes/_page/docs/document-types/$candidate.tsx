import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { DocumentTypeCandidate } from "../../../../../routes/docs/DocumentTypeCandidateRoute";

const DocumentTypeCandidatePage = lazy(async () => {
  const module = await import("../../../../../routes/docs/DocumentTypeCandidateRoute");
  return { default: module.DocumentTypeCandidateRoute };
});

const candidates = new Set<DocumentTypeCandidate>([
  "rich-text",
  "order",
  "object",
  "tree",
  "database",
  "calendar",
  "sheet",
  "kanban",
  "annotation",
]);

export const Route = createFileRoute("/_page/docs/document-types/$candidate")({
  beforeLoad: ({ params }) => {
    if (!candidates.has(params.candidate as DocumentTypeCandidate)) throw notFound();
  },
  component: CandidateRoute,
});

function CandidateRoute() {
  const { candidate } = Route.useParams();
  return (
    <Suspense fallback={null}>
      <DocumentTypeCandidatePage candidate={candidate as DocumentTypeCandidate} />
    </Suspense>
  );
}
