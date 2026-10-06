import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Minimal, safe renderer for curated content. Supports:
 *   paragraphs (blank-line separated), "- " bullet lists, "1. " numbered lists,
 *   ``` fenced code blocks, `inline code` and **bold**.
 * It builds React elements directly (no HTML injection), so content can never
 * execute scripts even if an admin pastes markup.
 */

type Block =
  | { kind: "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "code"; text: string; lang: string };

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] as string;
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] as string).trim().startsWith("```")) {
        body.push(lines[index] as string);
        index += 1;
      }
      blocks.push({ kind: "code", text: body.join("\n"), lang });
      index += 1;
      continue;
    }
    if (/^\s*[-*] /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*] /.test(lines[index] as string)) {
        items.push((lines[index] as string).replace(/^\s*[-*] /, ""));
        index += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (/^\s*\d+\. /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\. /.test(lines[index] as string)) {
        items.push((lines[index] as string).replace(/^\s*\d+\. /, ""));
        index += 1;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      (lines[index] as string).trim() !== "" &&
      !/^\s*([-*]|\d+\.) /.test(lines[index] as string) &&
      !(lines[index] as string).trim().startsWith("```")
    ) {
      paragraph.push((lines[index] as string).trim());
      index += 1;
    }
    blocks.push({ kind: "p", text: paragraph.join(" ") });
  }
  return blocks;
}

/** Renders `code` and **bold** spans inside a line of text. */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code key={index} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}

export function RichText({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className={cn("grid gap-3 text-sm leading-relaxed", className)}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "p":
            return (
              <p key={index}>
                <Inline text={block.text} />
              </p>
            );
          case "ul":
            return (
              <ul key={index} className="grid list-disc gap-1 pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={index} className="grid list-decimal gap-1 pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Inline text={item} />
                  </li>
                ))}
              </ol>
            );
          case "code":
            return (
              <pre
                key={index}
                className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed"
              >
                <code data-lang={block.lang || undefined}>{block.text}</code>
              </pre>
            );
        }
      })}
    </div>
  );
}
