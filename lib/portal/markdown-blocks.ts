export type MarkdownSegment =
  | { kind: "markdown"; body: string }
  | { kind: "details"; step: string | null; title: string; subtitle: string | null; body: string };

export type InlinePromptToken =
  | { kind: "text"; value: string }
  | { kind: "placeholder"; value: string };

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
const COLLAPSIBLE_H3_RE = /^ {0,3}###\s+▸\s+(.+?)\s*$/;
const BOUNDARY_RE = /^ {0,3}(?:##?#?\s+|---+\s*$|\*\*\*+\s*$)/;
const BOX_DRAWING_RE = /[┌┐└┘─│├┤┬┴┼▼▲►◄]/;
const STEP_PREFIX_RE = /^([A-Z0-9]{1,2})\.\s+(.+)$/;

/**
 * Splits a `"A. Title — Subtitle"` header from `### ▸ A. Title — Subtitle` into
 * `{ step, title, subtitle }` so the card can render a visual badge (`A`),
 * the title in primary text, and the subtitle stacked beneath it.
 */
export function parseCollapsibleHeader(raw: string): {
  step: string | null;
  title: string;
  subtitle: string | null;
} {
  const trimmed = raw.trim();
  const sep = trimmed.indexOf(" — ");
  const rawMain = sep === -1 ? trimmed : trimmed.slice(0, sep).trim();
  const subtitle = sep === -1 ? null : trimmed.slice(sep + 3).trim() || null;

  const stepMatch = STEP_PREFIX_RE.exec(rawMain);
  if (stepMatch) {
    return {
      step: stepMatch[1],
      title: stepMatch[2].trim(),
      subtitle,
    };
  }
  return { step: null, title: rawMain, subtitle };
}

/**
 * Splits Markdown into normal sections and collapsible `### ▸ ...` cards.
 * Respects fenced code blocks (` ``` ` / ` ~~~ `) so headings inside examples
 * are never treated as section boundaries.
 */
export function splitMarkdownBlocks(source: string): MarkdownSegment[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const segments: MarkdownSegment[] = [];

  let currentKind: "markdown" | "details" = "markdown";
  let currentHeader: { step: string | null; title: string; subtitle: string | null } | null = null;
  let buffer: string[] = [];
  let activeFence: string | null = null;

  const flush = () => {
    const body = buffer.join("\n").trim();
    if (currentKind === "details" && currentHeader) {
      segments.push({
        kind: "details",
        step: currentHeader.step,
        title: currentHeader.title,
        subtitle: currentHeader.subtitle,
        body,
      });
    } else if (body.length > 0) {
      segments.push({ kind: "markdown", body });
    }
    buffer = [];
    currentHeader = null;
    currentKind = "markdown";
  };

  for (const line of lines) {
    const fenceMatch = FENCE_RE.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!activeFence) {
        activeFence = marker;
      } else if (line.trimStart().startsWith(activeFence[0].repeat(activeFence.length))) {
        activeFence = null;
      }
      buffer.push(line);
      continue;
    }

    if (!activeFence) {
      const collapsible = COLLAPSIBLE_H3_RE.exec(line);
      if (collapsible) {
        flush();
        currentKind = "details";
        currentHeader = parseCollapsibleHeader(collapsible[1]);
        continue;
      }

      if (currentKind === "details" && BOUNDARY_RE.test(line)) {
        flush();
        buffer.push(line);
        continue;
      }
    }

    buffer.push(line);
  }

  flush();
  return segments;
}

/**
 * Inspects a fenced block's language class (`language-prompt`, `language-plantilla`, etc.)
 * and text content to decide whether it should render as a human-friendly Prompt/Template Card.
 */
export function classifyCodeBlock(className: string | undefined, code: string): {
  copyable: boolean;
  wrapLines: boolean;
  variant: "prompt" | "template" | "code";
  badge: string | null;
} {
  const rawLang = (className ?? "").replace(/^language-/, "").trim().toLowerCase();
  const isDiagram = BOX_DRAWING_RE.test(code) && !rawLang;
  if (isDiagram) {
    return { copyable: false, wrapLines: false, variant: "code", badge: null };
  }

  if (rawLang === "plantilla" || rawLang === "template" || rawLang === "text") {
    return { copyable: code.trim().length > 0, wrapLines: true, variant: "template", badge: "Plantilla" };
  }

  if (rawLang === "" || rawLang === "prompt" || rawLang === "markdown" || rawLang === "md") {
    return { copyable: code.trim().length > 0, wrapLines: true, variant: "prompt", badge: "Prompt" };
  }

  return {
    copyable: code.trim().length > 0,
    wrapLines: false,
    variant: "code",
    badge: rawLang || null,
  };
}

/**
 * Splits a line of prompt text so `[bracketed variables]` can be highlighted
 * as visual fill-in chips for non-technical users.
 */
export function tokenizePromptLine(line: string): InlinePromptToken[] {
  const tokens: InlinePromptToken[] = [];
  const pattern = /(\[[^\[\]\n]+\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: "text", value: line.slice(lastIndex, match.index) });
    }
    tokens.push({ kind: "placeholder", value: match[1] });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push({ kind: "text", value: line.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ kind: "text", value: line }];
}
