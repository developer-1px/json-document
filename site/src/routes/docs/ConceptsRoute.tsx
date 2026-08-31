import conceptsMarkdown from "../../../../docs/public/concepts.md?raw";
import type { PetiteCatIllustration } from "../../shared/ui/primitives";
import { docPages } from "./doc-pages";
import { DocumentationPage } from "./DocumentationPage";
import { DocsRoute } from "./DocsRoute";

const editingConceptIllustrations: Record<"selection" | "history" | "clipboard", PetiteCatIllustration> = {
  selection: "cursor",
  history: "branch",
  clipboard: "clipboard",
};

export function ConceptsRoute() {
  return (
    <EditingConceptRoute
      title="Concept Map"
      source={conceptsMarkdown}
      illustration="sleep"
      summary="JSON 값에서 시작해 사람이 편집하는 artifact가 되기까지의 책임과 의존 순서입니다."
    />
  );
}

export function SelectionDocsRoute() {
  return <DocsRoute pageId="selection" />;
}

export function HistoryDocsRoute() {
  return <DocsRoute pageId="history" />;
}

export function ClipboardDocsRoute() {
  return <DocsRoute pageId="clipboard" />;
}

function EditingConceptRoute(props: {
  readonly pageId?: keyof typeof editingConceptIllustrations;
  readonly title?: string;
  readonly source?: string;
  readonly illustration?: PetiteCatIllustration;
  readonly summary?: string;
}) {
  const page = props.pageId ? docPages[props.pageId] : undefined;
  const title = props.title ?? page?.title ?? "";
  const source = props.source ?? page?.source ?? "";
  const illustration = props.illustration
    ?? (props.pageId ? editingConceptIllustrations[props.pageId] : "cursor");
  return (
    <DocumentationPage
      title={title}
      source={source}
      illustration={illustration}
      summary={props.summary}
    />
  );
}
