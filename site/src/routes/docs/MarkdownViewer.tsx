import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { InlineCode } from "../../shared/ui/code-block";
import { codeLanguage } from "../../shared/ui/code-tokens";
import { ShikiSourceCodeBlock } from "../../shared/demo-workbench/ShikiSourceCodeBlock";
import { ActionLink } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import { LiveDemo } from "../../app/live-demo-registry";

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
            <h2 id={id} className={classes("mb-0", ui.text.section)}>
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

            if (className === "language-live-demo") {
              return <LiveDemo path={String(children).trim()} />;
            }

            const language = codeLanguage(/^language-(.+)$/.exec(className)?.[1]);
            return <ShikiSourceCodeBlock language={language} source={String(children)} />;
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
  "concepts.md": "/docs/concepts",
  "selection.md": "/docs/selection",
  "history.md": "/docs/history",
  "clipboard.md": "/docs/clipboard",
  "topology.md": "/docs/topology",
  "intent.md": "/docs/intent",
  "intent-guide.md": "/docs/intent-guide",
  "connectors.md": "/docs/connectors",
  "connector-react.md": "/docs/connector-react",
  "connector-react-hook-form.md": "/docs/connector-react-hook-form",
  "connector-ajv.md": "/docs/connector-ajv",
  "connector-zod.md": "/docs/connector-zod",
  "connector-zod-validate.md": "/docs/connector-zod-validate",
  "connector-tanstack-table.md": "/docs/connector-tanstack-table",
  "react-editing.md": "/docs/react-editing",
  "adapters.md": "/docs/adapters",
  "adapter-keyboard.md": "/docs/adapter-keyboard",
  "adapter-clipboard.md": "/docs/adapter-clipboard",
  "adapter-contenteditable.md": "/docs/adapter-contenteditable",
  "affordance.md": "/docs/affordance",
  "affordance-select.md": "/docs/affordance/select",
  "affordance-fold.md": "/docs/affordance/fold",
  "affordance-drag.md": "/docs/affordance/drag",
  "affordance-history.md": "/docs/affordance/history",
  "affordance-focus.md": "/docs/affordance/focus",
  "affordance-caret.md": "/docs/affordance/caret",
  "affordance-typeahead.md": "/docs/affordance/typeahead",
  "affordance-activate.md": "/docs/affordance/activate",
  "affordance-cancel.md": "/docs/affordance/cancel",
  "affordance-delete.md": "/docs/affordance/delete",
  "affordance-rename.md": "/docs/affordance/rename",
  "affordance-nudge.md": "/docs/affordance/nudge",
  "affordance-hover.md": "/docs/affordance/hover",
  "affordance-double-click.md": "/docs/affordance/double-click",
  "affordance-triple-click.md": "/docs/affordance/triple-click",
  "affordance-context-menu.md": "/docs/affordance/context-menu",
  "affordance-marquee.md": "/docs/affordance/marquee",
  "affordance-drop.md": "/docs/affordance/drop",
  "affordance-copy-drag.md": "/docs/affordance/copy-drag",
  "affordance-resize.md": "/docs/affordance/resize",
  "affordance-pan.md": "/docs/affordance/pan",
  "affordance-scroll.md": "/docs/affordance/scroll",
  "affordance-zoom.md": "/docs/affordance/zoom",
  "affordance-snap.md": "/docs/affordance/snap",
  "affordance-forbid.md": "/docs/affordance/forbid",
  "collaboration.md": "/docs/collaboration",
  "collaboration-replica.md": "/docs/collaboration/replica",
  "collaboration-history.md": "/docs/collaboration/history",
  "collaboration-text.md": "/docs/collaboration/text",
  "collaboration-lease.md": "/docs/collaboration/text/lease",
  "collaboration-lifecycle.md": "/docs/collaboration/lifecycle",
  "hands.md": "/editors",
  "composer.md": "/docs/composer",
  "mention.md": "/docs/mention",
  "order.md": "/docs/order",
  "object.md": "/docs/object",
  "tree.md": "/docs/tree",
  "database.md": "/docs/database",
};

function rewriteMarkdownHref(href: string | undefined): string | undefined {
  if (!href) return href;
  const file = href.replace(/^\.\//, "");
  const hashIndex = file.indexOf("#");
  const path = hashIndex === -1 ? file : file.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : file.slice(hashIndex);
  const rewritten = markdownHrefs[path];
  return rewritten ? `${rewritten}${hash}` : href;
}

function headingId(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    || "section";
}
