import { useMemo } from "react";
import { MarkdownViewer, markdownHeadings } from "./MarkdownViewer";
import { docPageOrder, docPages, type DocPageId } from "./doc-pages";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[11rem_minmax(0,1fr)] lg:px-6">
        <aside className="hidden self-start text-xs leading-5 lg:sticky lg:top-4 lg:flex">
          <div>
            <nav aria-label="Documentation pages">
              <div className="mb-2 font-medium text-stone-950">Docs</div>
              <div className="grid">
                {docPageOrder.map((id) => {
                  const item = docPages[id];
                  return (
                    <a
                      key={item.path}
                      href={sitePath(item.path)}
                      aria-current={item.path === page.path ? "page" : undefined}
                      className="border-l border-transparent px-3 py-1 text-stone-500 no-underline hover:text-stone-950 aria-[current=page]:border-stone-950 aria-[current=page]:font-medium aria-[current=page]:text-stone-950"
                    >
                      {item.label}
                    </a>
                  );
                })}
              </div>
            </nav>

            <nav aria-label="On this page" className="mt-6">
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
          </div>
        </aside>

        <div className="min-w-0">
          <nav aria-label="Documentation pages" className="mb-3 overflow-x-auto border-b border-stone-200 pb-2 text-xs lg:hidden">
            <div className="flex gap-1 whitespace-nowrap">
              {docPageOrder.map((id) => {
                const item = docPages[id];
                return (
                  <a
                    key={item.path}
                    href={sitePath(item.path)}
                    aria-current={item.path === page.path ? "page" : undefined}
                    className="px-2 py-1 text-stone-500 no-underline hover:text-stone-950 aria-[current=page]:font-medium aria-[current=page]:text-stone-950"
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          </nav>

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
      </div>
    </main>
  );
}

function sitePath(path: string): string {
  return `${basePath}${path}` || "/";
}
