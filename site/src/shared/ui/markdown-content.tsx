import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import {
  MarkdownRenderer,
  type MarkdownComponents,
  type MarkdownRendererProps,
} from "@interactive-os/json-document-markdown-react";
import { CodeBlock, InlineCode } from "./code-block";
import { codeLanguage } from "./code-tokens";
import { ActionLink } from "./interactive";
import { classes } from "./styles";

export const markdownContentComponents: MarkdownComponents = {
  h1: ({ children, id }) => <h1 id={id} className={contentPresentation.title}>{children}</h1>,
  h2: ({ children, id }) => <h2 id={id} className={contentPresentation.heading}>{children}</h2>,
  h3: ({ children, id }) => <h3 id={id} className={contentPresentation.itemTitle}>{children}</h3>,
  h4: ({ children, id }) => <h4 id={id} className={contentPresentation.itemTitle}>{children}</h4>,
  p: ({ children }) => <p className={contentPresentation.body}>{children}</p>,
  ul: ({ children }) => <ul className={contentPresentation.list}>{children}</ul>,
  ol: ({ children }) => <ol className={contentPresentation.list}>{children}</ol>,
  blockquote: ({ children }) => <blockquote className={contentPresentation.quote}>{children}</blockquote>,
  hr: () => <hr className={contentPresentation.divider} />,
  table: ({ children }) => <div className={contentPresentation.tableViewport}><table className={contentPresentation.table}>{children}</table></div>,
  th: ({ children }) => <th className={contentPresentation.tableHead}>{children}</th>,
  td: ({ children }) => <td className={contentPresentation.tableCell}>{children}</td>,
  img: (props) => <img {...props} className={contentPresentation.image} />,
  code: ({ children, className }) => {
    if (!className) return <InlineCode>{children}</InlineCode>;
    return <CodeBlock language={codeLanguage(/^language-(.+)$/.exec(className)?.[1])} size="content" source={String(children)} />;
  },
  pre: ({ children }) => <>{children}</>,
  a: ({ href, children }) => href ? <ActionLink href={href}>{children}</ActionLink> : <span>{children}</span>,
};

export function MarkdownContent({ className, components, ...props }: MarkdownRendererProps) {
  return (
    <MarkdownRenderer
      {...props}
      className={classes("grid min-w-0 gap-group", className)}
      components={{ ...markdownContentComponents, ...components }}
    />
  );
}
