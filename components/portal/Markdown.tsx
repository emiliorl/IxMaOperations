import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { safeHttpUrl } from "@/lib/portal/constants";

/**
 * Renders the owner-written action plans and overviews.
 *
 * The text is rendered as Markdown only: raw HTML is NOT interpreted (react-markdown
 * escapes it), images are dropped (nothing external is loaded into the portal),
 * and links open in a new tab and only when they are http(s).
 */
const components: Components = {
  h1: (props) => <h3 className="mt-6 mb-2 text-base font-semibold text-zinc-100 first:mt-0" {...props} />,
  h2: (props) => <h3 className="mt-6 mb-2 text-base font-semibold text-zinc-100 first:mt-0" {...props} />,
  h3: (props) => <h4 className="mt-5 mb-1.5 text-sm font-semibold text-zinc-100 first:mt-0" {...props} />,
  h4: (props) => <h5 className="mt-4 mb-1 text-sm font-medium text-zinc-200 first:mt-0" {...props} />,
  p: (props) => <p className="my-2 break-words text-sm leading-relaxed text-zinc-300" {...props} />,
  ul: (props) => <ul className="my-2 list-disc space-y-1 pl-5 text-sm text-zinc-300 marker:text-zinc-600" {...props} />,
  ol: (props) => <ol className="my-2 list-decimal space-y-1 pl-5 text-sm text-zinc-300 marker:text-zinc-600" {...props} />,
  li: (props) => <li className="break-words leading-relaxed" {...props} />,
  strong: (props) => <strong className="font-semibold text-zinc-100" {...props} />,
  em: (props) => <em className="italic text-zinc-200" {...props} />,
  hr: () => <hr className="my-5 border-zinc-800" />,
  blockquote: (props) => <blockquote className="my-3 border-l-2 border-zinc-700 pl-4 text-zinc-400" {...props} />,
  code: (props) => <code className="rounded bg-zinc-800/80 px-1 py-0.5 font-mono text-[0.85em] text-zinc-200" {...props} />,
  pre: (props) => (
    <pre className="my-3 overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 [&_code]:bg-transparent [&_code]:p-0" {...props} />
  ),
  table: (props) => (
    <div className="my-3 overflow-x-auto rounded-md border border-zinc-800">
      <table className="w-full text-left text-xs text-zinc-300" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-zinc-900/80 font-mono uppercase tracking-wider text-zinc-500" {...props} />,
  th: (props) => <th className="px-3 py-2 font-normal" {...props} />,
  td: (props) => <td className="border-t border-zinc-800/80 px-3 py-2 align-top" {...props} />,
  img: () => null,
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
  return (
    <div className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
