import conceptsMarkdown from "../../../../docs/public/concepts.md?raw";
import { ActionLink } from "../../shared/ui/interactive";
import { PageFrame, PageHeader, type PetiteCatIllustration } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { docPages, type DocPageId } from "./doc-pages";
import { DocsRoute } from "./DocsRoute";
import { MarkdownViewer, markdownHeadings } from "./MarkdownViewer";

export function ConceptsRoute() {
  return (
    <EditingConceptRoute
      title="코어 컨셉"
      source={conceptsMarkdown}
      illustration="sleep"
      summary="JSON Document에 Editing과 Connector가 차례로 이어집니다."
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
  readonly pageId?: Exclude<DocPageId, "overview" | "quickstart" | "connectors" | "api" | "topology" | "intent" | "intentGuide">;
  readonly title?: string;
  readonly source?: string;
  readonly illustration?: PetiteCatIllustration;
  readonly summary?: string;
}) {
  const page = props.pageId ? docPages[props.pageId] : undefined;
  const title = props.title ?? page?.title ?? "";
  const source = props.source ?? page?.source ?? "";
  const illustration = props.illustration ?? "cursor";
  const headings = markdownHeadings(source).filter((heading) => heading.level === 2);

  return (
    <PageFrame>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="min-w-0">
          <PageHeader title={title} illustration={illustration}>
            {props.summary}
          </PageHeader>

          <nav aria-label="On this page" className={classes("mb-6 lg:hidden", ui.text.meta)}>
            <div className="flex flex-wrap gap-1">
              {headings.map((heading) => (
                <ActionLink key={heading.id} href={`#${heading.id}`} className={classes("px-2 py-1 no-underline", ui.text.meta)}>
                  {heading.text}
                </ActionLink>
              ))}
            </div>
          </nav>

          <div className="mx-auto max-w-3xl">
            <MarkdownViewer source={source} hideTitle />
          </div>
        </div>

        <aside className="hidden min-w-0 self-start lg:sticky lg:top-4 lg:block">
          <nav aria-label="On this page" className={classes("mb-4 hidden lg:block", ui.text.meta)}>
            <div className={classes("mb-2", ui.text.heading)}>On this page</div>
            <div className="grid">
              {headings.map((heading) => (
                <ActionLink
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={classes("px-3 py-1 no-underline", ui.surface.navigationRule, ui.text.meta)}
                >
                  {heading.text}
                </ActionLink>
              ))}
            </div>
          </nav>
        </aside>
      </div>
    </PageFrame>
  );
}
