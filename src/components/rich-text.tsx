import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/*
 * Markdown rendering for curated content (topic explanations, answers,
 * guidance) via react-markdown + GitHub-flavoured markdown. Raw HTML in the
 * source is NOT rendered (react-markdown's default), so content can never
 * inject scripts. Links open safely in a new tab.
 */

const blockComponents: Components = {
  p: ({ children }) => <p>{children}</p>,
  ul: ({ children }) => <ul className="grid list-disc gap-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="grid list-decimal gap-1 pl-5">{children}</ol>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="underline underline-offset-2"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  h1: ({ children }) => <h3 className="font-semibold">{children}</h3>,
  h2: ({ children }) => <h3 className="font-semibold">{children}</h3>,
  h3: ({ children }) => <h4 className="font-semibold">{children}</h4>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 pl-3 text-muted-foreground">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b px-2 py-1 font-medium">{children}</th>,
  td: ({ children }) => <td className="border-b px-2 py-1">{children}</td>,
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed [&>code]:bg-transparent [&>code]:p-0">
      {children}
    </pre>
  ),
  code: ({ children, className }) => (
    <code className={cn("rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]", className)}>
      {children}
    </code>
  ),
};

/** Block-level markdown (paragraphs, lists, code blocks, tables). */
export function RichText({ source, className }: { source: string; className?: string }) {
  return (
    <div className={cn("grid gap-3 text-sm leading-relaxed", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={blockComponents}>
        {source}
      </ReactMarkdown>
    </div>
  );
}

const inlineComponents: Components = {
  ...blockComponents,
  p: ({ children }) => <>{children}</>,
};

/** Inline markdown for short strings such as answer options (`code`, **bold**). */
export function Inline({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={inlineComponents}
      allowedElements={["p", "code", "strong", "em", "del", "a"]}
      unwrapDisallowed
    >
      {text}
    </ReactMarkdown>
  );
}
