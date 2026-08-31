import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  DocumentTypeCandidateRoute,
  type DocumentTypeCandidate,
} from "../../../../../routes/docs/DocumentTypeCandidateRoute";

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
  return <DocumentTypeCandidateRoute candidate={candidate as DocumentTypeCandidate} />;
}
