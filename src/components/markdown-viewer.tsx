import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function slugifyKorean(s: string) {
  return (
    s
      ?.trim()
      .toLowerCase()
      // keep korean, alnum, space, dash
      .replace(/[^\p{Script=Hangul}\p{Letter}\p{Number}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "section"
  );
}

type HeadingTocItem = { depth: 2 | 3; text: string; id: string };

export function buildTocFromMarkdown(md: string): HeadingTocItem[] {
  const lines = (md ?? "").split(/\r?\n/);
  const items: HeadingTocItem[] = [];
  const used = new Map<string, number>();
  for (const line of lines) {
    const m = /^(##|###)\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const depth = m[1] === "##" ? (2 as const) : (3 as const);
    const text = m[2].trim();
    let base = slugifyKorean(text);
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    if (n > 1) base = `${base}-${n}`;
    items.push({ depth, text, id: base });
  }
  return items.slice(0, 40);
}

export function MarkdownViewer({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  const used = React.useRef<Map<string, number>>(new Map());
  used.current = new Map();

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }) => (
            <h1 className="text-xl font-semibold" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => {
            const text = String(children ?? "");
            let base = slugifyKorean(text);
            const n = (used.current.get(base) ?? 0) + 1;
            used.current.set(base, n);
            if (n > 1) base = `${base}-${n}`;
            return (
              <h2
                id={base}
                className="scroll-mt-24 border-b pb-2 text-base font-semibold"
                {...props}
              >
                {children}
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const text = String(children ?? "");
            let base = slugifyKorean(text);
            const n = (used.current.get(base) ?? 0) + 1;
            used.current.set(base, n);
            if (n > 1) base = `${base}-${n}`;
            return (
              <h3
                id={base}
                className="scroll-mt-24 text-sm font-semibold text-foreground"
                {...props}
              >
                {children}
              </h3>
            );
          },
          p: ({ children, ...props }) => (
            <p className="text-sm leading-relaxed text-foreground/90" {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="ml-4 list-disc space-y-1 text-sm" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="ml-4 list-decimal space-y-1 text-sm" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-foreground/90" {...props}>
              {children}
            </li>
          ),
          code: ({ children, ...props }) => (
            <code
              className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]"
              {...props}
            >
              {children}
            </code>
          ),
          pre: ({ children, ...props }) => (
            <pre
              className="overflow-x-auto rounded-md border bg-muted/30 p-3 text-[12px] leading-relaxed"
              {...props}
            >
              {children}
            </pre>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto rounded-md border" {...props}>
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th
              className="bg-muted/60 px-2 py-2 text-left text-xs font-semibold"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border-t px-2 py-2 align-top text-xs" {...props}>
              {children}
            </td>
          ),
          a: ({ children, ...props }) => (
            <a
              className="text-primary underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

