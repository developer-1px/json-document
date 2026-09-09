import rehypeSlug from "rehype-slug";
import { pageDescriptors } from "../../app/page-descriptors";
import { InlineCode } from "../../shared/ui/code-block";
import { codeLanguage } from "../../shared/ui/code-tokens";
import { ShikiSourceCodeBlock } from "../../shared/demo-workbench/ShikiSourceCodeBlock";
import { ActionLink } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import { LiveDemo } from "../../app/live-demo-registry";
import { MarkdownContent } from "../../shared/ui/markdown-content";

export function MarkdownViewer({ source, sourcePath = "docs/public/overview.md", hideTitle = false }: {
  source: string;
  sourcePath?: string;
  hideTitle?: boolean;
}) {
  return (
    <article className="min-w-0 max-w-full">
      <MarkdownContent
        content={source}
        rehypePlugins={[rehypeSlug]}
        components={{
          h1: ({ children, id }) => hideTitle
            ? null
            : <h1 id={id} className={classes("mb-0 mt-0", ui.text.heading)}>{children}</h1>,
          h2: ({ children, id }) => (
            <h2 id={id} data-doc-heading className={classes("mb-0", ui.text.section)}>
              {children}
            </h2>
          ),
          h3: ({ children, id }) => (
            <h3 id={id} className={classes("mb-0 mt-2", ui.text.heading)}>
              {children}
            </h3>
          ),
          code: ({ children, className }) => {
            if (!className) return <InlineCode>{children}</InlineCode>;

            if (className === "language-live-demo") {
              return <LiveDemo path={String(children).trim()} />;
            }

            const language = codeLanguage(/^language-(.+)$/.exec(className)?.[1]);
            return <ShikiSourceCodeBlock language={language} source={String(children)} />;
          },
          pre: ({ children }) => <>{children}</>,
          a: ({ href, children }) => {
            const target = rewriteMarkdownHref(href, sourcePath);
            return target ? <ActionLink href={target}>{children}</ActionLink> : <span>{children}</span>;
          },
        }}
      />
    </article>
  );
}

const documentRoutes = new Map(
  pageDescriptors.filter((page) => page.documentSource !== undefined)
    .map((page) => [page.documentSource, page.path]),
);

export function rewriteMarkdownHref(href: string | undefined, sourcePath: string): string | undefined {
  if (!href || /^(?:[a-z][a-z\d+.-]*:|[/#?])/i.test(href)) return href;
  const target = new URL(href, `https://documentation.invalid/${sourcePath}`);
  if (!target.pathname.endsWith(".md")) return href;
  const path = decodeURIComponent(target.pathname.slice(1));
  const route = documentRoutes.get(path);
  return `${route ?? `https://github.com/developer-1px/json-document/blob/main/${path}`}${target.search}${target.hash}`;
}
