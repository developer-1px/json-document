import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { CodeBlock, InlineCode } from "../../shared/ui/code-block";
import { codeLanguage } from "../../shared/ui/code-tokens";
import { ActionLink } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";

type MarkdownHeading = { id: string; level: number; text: string };

export function MarkdownViewer({ source, hideTitle = false }: { source: string; hideTitle?: boolean }) {
  return (
    <article className={classes("grid gap-4", ui.text.body)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          h1: ({ children, id }) => hideTitle
            ? null
            : <h1 id={id} className={classes("mb-0 mt-0", ui.text.heading)}>{children}</h1>,
          h2: ({ children, id }) => (
            <h2 id={id} className={classes("mb-0 mt-6 pt-5 first:mt-0", ui.surface.sectionDivider, ui.text.heading)}>
              {children}
            </h2>
          ),
          h3: ({ children, id }) => (
            <h3 id={id} className={classes("mb-0 mt-2", ui.text.heading)}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className={classes("m-0", ui.text.body)}>{children}</p>
          ),
          ul: ({ children }) => (
            <ul className={classes("m-0 list-disc pl-5", ui.text.body)}>{children}</ul>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className={classes("w-full min-w-[28rem]", ui.surface.table, ui.text.body)}>{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className={classes("py-1.5 pr-3", ui.surface.tableHead, ui.text.heading)}>{children}</th>
          ),
          td: ({ children }) => (
            <td className={classes("py-1.5 pr-3 align-top", ui.surface.tableCell, ui.text.body)}>{children}</td>
          ),
          code: ({ children, className }) => {
            if (!className) return <InlineCode>{children}</InlineCode>;

            const language = codeLanguage(/^language-(.+)$/.exec(className)?.[1]);
            return <CodeBlock language={language} size="content" source={String(children)} />;
          },
          pre: ({ children }) => <>{children}</>,
          a: ({ href, children }) => {
            const target = rewriteMarkdownHref(href);
            return target ? <ActionLink href={target}>{children}</ActionLink> : <span>{children}</span>;
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}

export function markdownHeadings(source: string): MarkdownHeading[] {
  return source
    .replace(/\r\n/g, "\n")
    .split("\n")
    .flatMap((line): MarkdownHeading[] => {
      const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
      if (!heading) return [];

      const text = stripInlineMarkdown(heading[2] ?? "");
      return [{ id: headingId(text), level: heading[1]?.length ?? 1, text }];
    });
}

function stripInlineMarkdown(text: string): string {
  return text.replace(/`([^`]+)`/g, "$1").trim();
}

const markdownHrefs: Readonly<Record<string, string>> = {
  "overview.md": "/docs",
  "api.md": "/docs/api",
  "quickstart.md": "/docs/tutorial",
  "concepts.md": "/docs/concepts",
  "selection.md": "/docs/selection",
  "history.md": "/docs/history",
  "clipboard.md": "/docs/clipboard",
  "topology.md": "/docs/topology",
  "intent.md": "/docs/intent",
  "intent-guide.md": "/docs/intent-guide",
  "connectors.md": "/docs/connectors",
  "collaboration.md": "/docs/collaboration",
  "collaboration-replica.md": "/docs/collaboration/replica",
  "collaboration-history.md": "/docs/collaboration/history",
  "collaboration-text.md": "/docs/collaboration/text",
  "collaboration-lease.md": "/docs/collaboration/text/lease",
  "collaboration-lifecycle.md": "/docs/collaboration/lifecycle",
  "editors.md": "/editors",
  "order.md": "/docs/order",
  "object.md": "/docs/object",
  "tree.md": "/docs/tree",
};

function rewriteMarkdownHref(href: string | undefined): string | undefined {
  if (!href) return href;
  const file = href.replace(/^\.\//, "");
  return markdownHrefs[file] ?? href;
}

function headingId(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    || "section";
}
