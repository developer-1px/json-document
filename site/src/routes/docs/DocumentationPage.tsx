import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ActionLink } from "../../shared/ui/interactive";
import { PageFrame, PageHeader, type PetiteCatIllustration } from "../../shared/ui/primitives";
import { classes } from "../../shared/ui/styles";
import { MarkdownViewer } from "./MarkdownViewer";

export function DocumentationPage(props: {
  readonly title: ReactNode;
  readonly source: string;
  readonly sourcePath?: string;
  readonly illustration: PetiteCatIllustration;
  readonly summary?: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [headings, setHeadings] = useState<ReadonlyArray<{ id: string; text: string }>>([]);
  useLayoutEffect(() => {
    setHeadings(Array.from(contentRef.current?.querySelectorAll("h2[data-doc-heading]") ?? [])
      .map((heading) => ({ id: heading.id, text: heading.textContent ?? "" })));
  }, [props.source]);

  return (
    <PageFrame>
      <div className="grid gap-region lg:grid-cols-[minmax(0,1fr)_11rem]">
        <div ref={contentRef} className="grid min-w-0 justify-items-center" data-doc-content>
          <div className="grid w-full max-w-3xl content-start gap-region">
            <PageHeader title={props.title} illustration={props.illustration}>
              {props.summary}
            </PageHeader>
            <nav aria-label="Documentation sections" className={classes("overflow-x-auto lg:hidden", contentPresentation.caption)}>
              <div className="flex gap-related whitespace-nowrap">
                {headings.map((heading) => (
                  <ActionLink
                    key={`${heading.id}-${heading.text}`}
                    href={`#${heading.id}`}
                    className="shrink-0 whitespace-nowrap px-related py-related no-underline"
                  >
                    {heading.text}
                  </ActionLink>
                ))}
              </div>
            </nav>
            <MarkdownViewer source={props.source} sourcePath={props.sourcePath} hideTitle />
          </div>
        </div>

        <aside className={classes("hidden min-w-0 self-start lg:sticky lg:top-4 lg:block", contentPresentation.caption)}>
          <nav aria-label="On this page" className="grid gap-related">
            <div className={contentPresentation.itemTitle}>On this page</div>
            <div className="grid">
              {headings.map((heading) => (
                <ActionLink
                  key={`${heading.id}-${heading.text}`}
                  href={`#${heading.id}`}
                  className={classes("min-w-0 break-words px-related py-1 no-underline", contentPresentation.caption)}
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
