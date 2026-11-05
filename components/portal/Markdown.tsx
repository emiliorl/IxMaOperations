import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { safeHttpUrl } from "@/lib/portal/constants";
import { classifyCodeBlock, splitMarkdownBlocks } from "@/lib/portal/markdown-blocks";
import { CodeBlock } from "./CodeBlock";

function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return extractText(node.props.children);
  return "";
}

/**
 * Renders the owner-written action plans and overviews.
 *
 * The text is rendered as Markdown only: raw HTML is NOT interpreted (react-markdown
 * escapes it), images are dropped (nothing external is loaded into the portal),
 * and links open in a new tab and only when they are http(s).
 *
 * Headings starting with `### ▸ A. Title — Subtitle` render as interactive cards so
 * multi-prompt playbooks feel like an approachable workspace guide rather than code docs.
 */
const components: Components = {
  h1: (props) => <h3 className="mt-7 mb-2.5 text-lg sm:text-xl font-semibold tracking-tight text-white first:mt-0" {...props} />,
  h2: (props) => <h3 className="mt-7 mb-2.5 text-lg sm:text-xl font-semibold tracking-tight text-white first:mt-0" {...props} />,
  h3: (props) => <h4 className="mt-6 mb-2 text-base font-semibold text-zinc-100 first:mt-0" {...props} />,
  h4: (props) => <h5 className="mt-4 mb-1.5 text-sm font-semibold text-zinc-200 first:mt-0" {...props} />,
  p: (props) => <p className="my-2.5 break-words text-sm sm:text-[15px] leading-relaxed text-zinc-300" {...props} />,
  ul: (props) => <ul className="my-3 list-disc space-y-2 pl-5 text-sm sm:text-[15px] text-zinc-300 marker:text-zinc-500" {...props} />,
  ol: (props) => (
    <ol
      className="my-3.5 list-none space-y-2.5 pl-0 text-sm sm:text-[15px] text-zinc-300 [counter-reset:step] [&>li]:relative [&>li]:rounded-lg [&>li]:border [&>li]:border-zinc-800/80 [&>li]:bg-zinc-900/40 [&>li]:py-2.5 [&>li]:pr-4 [&>li]:pl-11 [&>li]:[counter-increment:step] [&>li]:before:absolute [&>li]:before:top-2.5 [&>li]:before:left-3 [&>li]:before:flex [&>li]:before:h-5 [&>li]:before:w-5 [&>li]:before:items-center [&>li]:before:justify-center [&>li]:before:rounded-full [&>li]:before:border [&>li]:before:border-zinc-700 [&>li]:before:bg-zinc-800 [&>li]:before:text-xs [&>li]:before:font-semibold [&>li]:before:text-zinc-100 [&>li]:before:content-[counter(step)]"
      {...props}
    />
  ),
  li: (props) => <li className="break-words leading-relaxed" {...props} />,
  strong: (props) => <strong className="font-semibold text-white" {...props} />,
  em: (props) => <em className="italic text-zinc-200" {...props} />,
  hr: () => <hr className="my-6 border-zinc-800/80" />,
  blockquote: (props) => (
    <blockquote
      className="my-4 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm sm:text-[15px] text-zinc-200 [&>p]:my-0"
      {...props}
    />
  ),
  code: (props) => <code className="rounded bg-zinc-800/90 px-1.5 py-0.5 text-[0.9em] font-medium text-zinc-100" {...props} />,
  pre: ({ children, ...props }) => {
    const codeChild = isValidElement<{ className?: string; children?: ReactNode }>(children) ? children : null;
    const rawCode = extractText(codeChild ?? children).replace(/\n$/, "");
    const info = classifyCodeBlock(codeChild?.props.className, rawCode);
    if (info.copyable) {
      return <CodeBlock code={rawCode} variant={info.variant} badge={info.badge} wrapLines={info.wrapLines} />;
    }
    return (
      <pre
        className="my-3 overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 [&_code]:bg-transparent [&_code]:p-0"
        {...props}
      >
        {children}
      </pre>
    );
  },
  table: (props) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/30">
      <table className="w-full text-left text-xs sm:text-sm text-zinc-300" {...props} />
    </div>
  ),
  thead: (props) => <thead className="border-b border-zinc-800 bg-zinc-900/90 text-xs font-semibold text-zinc-200" {...props} />,
  th: (props) => <th className="px-4 py-3 font-semibold" {...props} />,
  td: (props) => <td className="border-t border-zinc-800/70 px-4 py-3 align-top leading-relaxed" {...props} />,
  img: ({ src, alt, ...props }) => {
    if (!src) return null;
    return (
      <figure className="my-5 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60 shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ""} className="w-full h-auto object-cover" {...props} />
        {alt && (
          <figcaption className="border-t border-zinc-800/80 bg-zinc-900/60 px-4 py-2 text-center text-xs text-zinc-400">
            {alt}
          </figcaption>
        )}
      </figure>
    );
  },
  a: ({ href, children }) => {
    const safe = safeHttpUrl(href ?? null);
    if (!safe) return <>{children}</>;
    return (
      <a href={safe} target="_blank" rel="noreferrer noopener" className="text-zinc-100 underline underline-offset-4 hover:text-white">
        {children}
      </a>
    );
  },
};

export function Markdown({ children }: { children: string }) {
  const segments = splitMarkdownBlocks(children);
  return (
    <div className="max-w-none">
      {segments.map((segment, index) =>
        segment.kind === "details" ? (
          <details
            key={index}
            open={index === 0 || (index === 1 && segments[0]?.kind === "markdown")}
            className="group my-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 transition-colors hover:border-zinc-700 open:border-zinc-700 open:bg-zinc-900/60"
          >
            <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-4 px-4 py-3.5 sm:px-5 sm:py-4 hover:bg-zinc-900/60">
              <span className="flex min-w-0 items-start gap-3.5">
                {segment.step && (
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-xs font-semibold text-white">
                    {segment.step}
                  </span>
                )}
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-[15px] sm:text-base font-semibold text-white">
                    {segment.title}
                  </span>
                  {segment.subtitle && (
                    <span className="block text-xs sm:text-sm leading-snug text-zinc-400">
                      {segment.subtitle}
                    </span>
                  )}
                </span>
              </span>
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 transition-transform group-hover:border-zinc-700 group-hover:text-zinc-200 group-open:rotate-180"
              >
                ⌄
              </span>
            </summary>
            <div className="border-t border-zinc-800/80 px-4 py-4 sm:px-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {segment.body}
              </ReactMarkdown>
            </div>
          </details>
        ) : (
          <ReactMarkdown key={index} remarkPlugins={[remarkGfm]} components={components}>
            {segment.body}
          </ReactMarkdown>
        )
      )}
    </div>
  );
}
