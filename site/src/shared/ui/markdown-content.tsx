import {
  MarkdownRenderer,
  type MarkdownComponents,
  type MarkdownRendererProps,
} from "@interactive-os/json-document-markdown-react";
import { CodeBlock, InlineCode } from "./code-block";
import { codeLanguage } from "./code-tokens";
import { ActionLink } from "./interactive";
import { classes, ui } from "./styles";

export const markdownContentComponents: MarkdownComponents = {
  h1: ({ children, id }) => <h1 id={id} className={ui.markdown.heading}>{children}</h1>,
  h2: ({ children, id }) => <h2 id={id} className={ui.markdown.section}>{children}</h2>,
  h3: ({ children, id }) => <h3 id={id} className={ui.markdown.heading}>{children}</h3>,
  h4: ({ children, id }) => <h4 id={id} className={ui.markdown.heading}>{children}</h4>,
  p: ({ children }) => <p className={ui.markdown.paragraph}>{children}</p>,
  ul: ({ children }) => <ul className={classes(ui.markdown.list, ui.markdown.unorderedList)}>{children}</ul>,
  ol: ({ children }) => <ol className={classes(ui.markdown.list, ui.markdown.orderedList)}>{children}</ol>,
  blockquote: ({ children }) => <blockquote className={ui.markdown.quote}>{children}</blockquote>,
  hr: () => <hr className={ui.markdown.rule} />,
  table: ({ children }) => <div className={ui.markdown.tableViewport}><table className={ui.markdown.table}>{children}</table></div>,
  th: ({ children }) => <th className={ui.markdown.tableHead}>{children}</th>,
  td: ({ children }) => <td className={ui.markdown.tableCell}>{children}</td>,
  img: (props) => <img {...props} className={ui.markdown.image} />,
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
      className={classes(ui.markdown.root, className)}
      components={{ ...markdownContentComponents, ...components }}
    />
  );
}
