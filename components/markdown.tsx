"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownProps {
  content: string;
  className?: string;
}

// Custom components for styling markdown elements
const markdownComponents: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-white mb-3 mt-4 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-white mb-2 mt-3 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-white mb-2 mt-3 first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-white mb-2 mt-2 first:mt-0">{children}</h4>
  ),

  // Paragraphs
  p: ({ children }) => (
    <p className="text-sm leading-relaxed mb-3 last:mb-0">{children}</p>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 mb-3 ml-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-3 ml-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-relaxed">{children}</li>
  ),

  // Code
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 rounded bg-zinc-700 text-blue-300 text-xs font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className={`block p-3 rounded-lg bg-zinc-900 text-zinc-200 text-xs font-mono overflow-x-auto mb-3 ${className}`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-3 last:mb-0">{children}</pre>
  ),

  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-blue-500 pl-3 my-3 text-zinc-400 italic">
      {children}
    </blockquote>
  ),

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
    >
      {children}
    </a>
  ),

  // Strong/Bold
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),

  // Emphasis/Italic
  em: ({ children }) => (
    <em className="italic text-zinc-300">{children}</em>
  ),

  // Horizontal rule
  hr: () => <hr className="border-zinc-700 my-4" />,

  // Tables
  table: ({ children }) => (
    <div className="overflow-x-auto mb-3">
      <table className="min-w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-zinc-800">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-zinc-700">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-white">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-zinc-300">{children}</td>
  ),
};

export function Markdown({ content, className = "" }: MarkdownProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Simplified version for inline/compact display
export function MarkdownInline({ content, className = "" }: MarkdownProps) {
  return (
    <span className={className}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        components={{
          ...markdownComponents,
          p: ({ children }) => <span className="text-sm">{children}</span>,
        }}
      >
        {content}
      </ReactMarkdown>
    </span>
  );
}
