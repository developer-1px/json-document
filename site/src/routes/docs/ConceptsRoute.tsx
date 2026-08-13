import conceptsMarkdown from "../../../../docs/public/concepts.md?raw";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { ConceptsLab } from "./ConceptsLab";
import { MarkdownViewer, markdownHeadings } from "./MarkdownViewer";

export function ConceptsRoute() {
  const headings = markdownHeadings(conceptsMarkdown).filter((heading) => heading.level === 2);

  return (
    <PageFrame>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0">
          <PageHeader title="코어 컨셉" illustration="sleep">
            읽기에서 시작해, 편집이 붙고, 바깥으로 확장됩니다. 한 번에
            다 쓰지 않습니다.
          </PageHeader>

          <nav aria-label="On this page" className={classes("mb-6 lg:hidden", ui.text.meta)}>
            <div className="flex flex-wrap gap-1">
              {headings.map((heading) => (
                <a key={heading.id} href={`#${heading.id}`} className={classes("px-2 py-1 no-underline", ui.text.meta)}>
                  {heading.text}
                </a>
              ))}
            </div>
          </nav>

          <div className="mx-auto max-w-3xl">
            <MarkdownViewer source={conceptsMarkdown} hideTitle />
          </div>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-4">
          <nav aria-label="On this page" className={classes("mb-4 hidden lg:block", ui.text.meta)}>
            <div className={classes("mb-2", ui.text.heading)}>On this page</div>
            <div className="grid">
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={classes("px-3 py-1 no-underline", ui.surface.navigationRule, ui.text.meta)}
                >
                  {heading.text}
                </a>
              ))}
            </div>
          </nav>
          <ConceptsLab />
        </aside>
      </div>
    </PageFrame>
  );
}
