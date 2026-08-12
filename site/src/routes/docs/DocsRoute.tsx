import { useMemo } from "react";
import { MarkdownViewer, markdownHeadings } from "./MarkdownViewer";
import { docPages, type DocPageId } from "./doc-pages";

export function DocsOverviewRoute() {
  return <DocsRoute pageId="overview" />;
}

export function QuickstartRoute() {
  return <DocsRoute pageId="quickstart" />;
}

export function ConnectorDocsRoute() {
  return <DocsRoute pageId="connectors" />;
}

export function ApiReferenceRoute() {
  return <DocsRoute pageId="api" />;
}

function DocsRoute({ pageId }: { readonly pageId: DocPageId }) {
  const page = docPages[pageId];
  const headings = useMemo(
    () => markdownHeadings(page.source).filter((heading) => heading.level === 2),
    [page.source],
  );

  return (
    <main className="min-h-full bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_11rem] lg:px-6">
        <div className="min-w-0">
          <nav aria-label="Documentation sections" className="mb-5 overflow-x-auto text-xs lg:hidden">
            <div className="flex gap-1 whitespace-nowrap">
              {headings.map((heading) => (
                <a
                  key={`${heading.id}-${heading.text}`}
                  href={`#${heading.id}`}
                  className="px-2 py-1 text-stone-500 no-underline hover:text-stone-950"
                >
                  {heading.text}
                </a>
              ))}
            </div>
          </nav>

          <div className="mx-auto max-w-3xl">
            <header className="mb-7 border-b border-stone-200 pb-4">
              <h1 className="m-0 text-2xl font-semibold text-stone-950">{page.title}</h1>
            </header>
            <MarkdownViewer source={page.source} hideTitle />
          </div>
        </div>

        <aside className="hidden self-start text-xs leading-5 lg:sticky lg:top-4 lg:block">
          <nav aria-label="On this page">
            <div className="mb-2 font-medium text-stone-950">On this page</div>
            <div className="grid">
              {headings.map((heading) => (
                <a
                  key={`${heading.id}-${heading.text}`}
                  href={`#${heading.id}`}
                  className="border-l border-transparent px-3 py-1 text-stone-500 no-underline hover:text-stone-950"
                >
                  {heading.text}
                </a>
              ))}
            </div>
          </nav>
        </aside>
      </div>
    </main>
  );
}
