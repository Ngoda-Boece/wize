import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Raw HTML in model or user output is never rendered: react-markdown ignores
// HTML nodes unless rehype-raw is added (it is not), and its default
// urlTransform strips javascript:/data: URLs.
const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow">
      {children}
    </a>
  ),
  img: ({ alt }) => <span className="text-subtle">[image : {alt ?? "sans description"}]</span>,
};

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
      {text}
    </ReactMarkdown>
  );
});
