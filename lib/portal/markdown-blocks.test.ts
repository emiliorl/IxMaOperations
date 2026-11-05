import { describe, expect, it } from "vitest";
import { classifyCodeBlock, parseCollapsibleHeader, splitMarkdownBlocks, tokenizePromptLine } from "./markdown-blocks";

describe("parseCollapsibleHeader", () => {
  it("extracts step badge, title, and optional subtitle separated by em-dash", () => {
    expect(parseCollapsibleHeader("A. Colisión Forzada — Cruza con otra industria")).toEqual({
      step: "A",
      title: "Colisión Forzada",
      subtitle: "Cruza con otra industria",
    });
    expect(parseCollapsibleHeader("Solo título")).toEqual({
      step: null,
      title: "Solo título",
      subtitle: null,
    });
  });
});

describe("splitMarkdownBlocks", () => {
  it("keeps standard markdown as a single segment when no collapsible headings exist", () => {
    const md = "### Título normal\n\nTexto y lista:\n- Uno\n- Dos";
    expect(splitMarkdownBlocks(md)).toEqual([{ kind: "markdown", body: md }]);
  });

  it("splits ### ▸ headings into collapsible details segments and closes on ## or ---", () => {
    const md = [
      "Intro general.",
      "",
      "### ▸ A. Colisión Forzada — Otra industria",
      "Explicación A.",
      "```prompt",
      "### ▸ Esto está dentro de un bloque de código y no debe partirse",
      "```",
      "",
      "### ▸ B. Método Inverso — Espacio negativo",
      "Explicación B.",
      "",
      "---",
      "",
      "## Cierre",
      "Texto final.",
    ].join("\n");

    const segments = splitMarkdownBlocks(md);
    expect(segments).toEqual([
      { kind: "markdown", body: "Intro general." },
      {
        kind: "details",
        step: "A",
        title: "Colisión Forzada",
        subtitle: "Otra industria",
        body: "Explicación A.\n```prompt\n### ▸ Esto está dentro de un bloque de código y no debe partirse\n```",
      },
      {
        kind: "details",
        step: "B",
        title: "Método Inverso",
        subtitle: "Espacio negativo",
        body: "Explicación B.",
      },
      {
        kind: "markdown",
        body: "---\n\n## Cierre\nTexto final.",
      },
    ]);
  });
});

describe("classifyCodeBlock", () => {
  it("treats ASCII box-drawing diagrams without a language tag as non-copyable, non-wrapping", () => {
    const diagram = "┌──────────┐\n│  PASO 1  │\n└────┬─────┘\n     ▼";
    expect(classifyCodeBlock(undefined, diagram)).toEqual({
      copyable: false,
      wrapLines: false,
      variant: "code",
      badge: null,
    });
  });

  it("treats prompt and template blocks as copyable and soft-wrapping with distinct variants", () => {
    expect(classifyCodeBlock("language-prompt", "Actúa como director creativo...")).toEqual({
      copyable: true,
      wrapLines: true,
      variant: "prompt",
      badge: "Prompt",
    });
    expect(classifyCodeBlock("language-plantilla", "[CÁPSULA DE ADN]")).toEqual({
      copyable: true,
      wrapLines: true,
      variant: "template",
      badge: "Plantilla",
    });
  });
});

describe("tokenizePromptLine", () => {
  it("highlights bracketed placeholders inside prompt lines", () => {
    expect(tokenizePromptLine("Rol: redactor para [Marca] en [Mes].")).toEqual([
      { kind: "text", value: "Rol: redactor para " },
      { kind: "placeholder", value: "[Marca]" },
      { kind: "text", value: " en " },
      { kind: "placeholder", value: "[Mes]" },
      { kind: "text", value: "." },
    ]);
  });

  it("handles severity and status tags as bracketed placeholders", () => {
    expect(tokenizePromptLine("- [DEFECTO]: Error de cota")).toEqual([
      { kind: "text", value: "- " },
      { kind: "placeholder", value: "[DEFECTO]" },
      { kind: "text", value: ": Error de cota" },
    ]);
  });
});
