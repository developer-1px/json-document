import ReactMarkdown, { type Components, type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import { projectStreamingMarkdown } from "./streaming-markdown.js";

export type MarkdownRendererProps = Readonly<{
  className?: string;
  components?: Components;
  content?: string | null;
  rehypePlugins?: Options["rehypePlugins"];
  streaming?: boolean;
}>;

export function MarkdownRenderer({ className, components, content, rehypePlugins, streaming = false }: MarkdownRendererProps) {
  const projection = projectStreamingMarkdown(content ?? "", streaming);
  return (
    <div className={className} data-markdown-renderer="true" data-markdown-streaming={streaming ? "true" : undefined}>
      <ReactMarkdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
        rehypePlugins={rehypePlugins}
        components={{
          a: ({ href, children, node: _node, ...props }) => href ? <a {...props} href={href} rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
          ...components,
        }}
      >{projection.markdown}</ReactMarkdown>
    </div>
  );
}

export type { Components as MarkdownComponents };
