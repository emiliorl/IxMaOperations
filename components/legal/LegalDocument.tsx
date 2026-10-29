import React from "react";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

interface LegalDocumentProps {
  title: string;
  intro: string;
  updatedLabel: string;
  updated: string;
  sections: LegalSection[];
}

/**
 * Shared layout for /privacy and /terms. Copy lives in messages/<locale>.json
 * under "Legal" (EN + ES), so the two pages stay structurally identical and
 * translators edit prose, not JSX. Plain left-aligned prose per STANDARDS.md.
 */
export function LegalDocument({ title, intro, updatedLabel, updated, sections }: LegalDocumentProps) {
  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-2xl space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">{title}</h1>
          <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            {updatedLabel}: {updated}
          </p>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">{intro}</p>
        </header>

        {sections.map((section, index) => (
          <section key={section.heading} className="space-y-3 border-t border-zinc-800 pt-6">
            <h2 className="text-base font-semibold text-zinc-100">
              <span className="font-mono text-xs text-zinc-500 mr-2">{String(index + 1).padStart(2, "0")}</span>
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm text-zinc-400 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
