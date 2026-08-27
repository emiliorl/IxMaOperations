/**
 * lib/services.ts
 *
 * Canonical content model for the 5 v2 service offers — single source of truth
 * for the homepage grid, service detail pages, examples gallery, and the
 * contact form's "which offer" dropdown.
 *
 * See PROJECT_BLUEPRINT.md Section 1 for the pain-point research this is
 * built from, and CURRENT_STAGE.md / PLAN_PROGRESS.md Stage 7 for status.
 *
 * Copy rules (STANDARDS.md, PROJECT_BLUEPRINT.md Section 5):
 * - Plain, client-facing language only — no TensorRT/LayoutLM/PLC/OPC-UA or
 *   other leftover industrial-B2B jargon.
 * - One CTA family site-wide: "Book a Call" (default) — routes to /contact.
 */

export type ServiceExample =
  | {
      type: "live-demo";
      /** Slug of the sandbox component that renders this offer's demo. */
      demoSlug: "lead-intelligence" | "visual-asset-vault";
      description: string;
    }
  | {
      type: "static";
      description: string;
    };

export interface ServiceOffer {
  /** URL slug — used at /services/[slug]. */
  slug: string;
  /** Short offer name shown on cards and in nav-adjacent contexts. */
  name: string;
  /** One-line, client-facing value pitch (the headline on the detail page). */
  pitch: string;
  /** The manual grind this offer replaces, in the client's own words. */
  painPoint: {
    description: string;
    hoursPerWeek: string;
  };
  /** Plain-English steps — no implementation jargon. Renders as an ordered list. */
  howItWorks: string[];
  /** The practical before/after example shown on the detail page and /examples. */
  example: ServiceExample;
  /** lucide-react icon name, resolved by the component that renders the grid. */
  icon: "FileVideo" | "Users" | "FolderCheck" | "Receipt" | "Inbox";
}

export const SERVICES: ServiceOffer[] = [
  {
    slug: "content-engine",
    name: "1-Click Content Engine",
    pitch: "Turn one raw video into 15 posts, ready for every platform you post to.",
    painPoint: {
      description:
        "Transcribing, summarizing, and reformatting one piece of content for X, LinkedIn, Instagram, and your newsletter — by hand, every single week.",
      hoursPerWeek: "10–12 hrs/week",
    },
    howItWorks: [
      "You drop in one raw video or recording.",
      "It's transcribed and broken down into the key ideas automatically.",
      "Each idea is rewritten into platform-ready drafts — threads, carousel outlines, captions, a newsletter blurb.",
      "You get a batch of ready-to-post drafts back the same day.",
    ],
    example: {
      type: "static",
      description: "Before/after: a raw transcript in, a generated thread and carousel outline out.",
    },
    icon: "FileVideo",
  },
  {
    slug: "lead-intelligence",
    name: "Automated Lead Intelligence",
    pitch: "Stop copy-pasting prospect data — get enriched leads with a drafted opener, ready to send.",
    painPoint: {
      description:
        "Manually visiting profiles, copying details into a spreadsheet, then writing a cold email from scratch for each one.",
      hoursPerWeek: "8–15 hrs/week",
    },
    howItWorks: [
      "You hand over a list of target profiles or a search criteria.",
      "Each one is visited and the relevant details are pulled automatically.",
      "Every lead gets enriched with context — company, role, recent activity.",
      "A personalized opening line is drafted for outreach — you just review and send.",
    ],
    example: {
      type: "live-demo",
      demoSlug: "lead-intelligence",
      description: "Live demo: watch a sample profile list get scraped, enriched, and turned into a drafted outreach line.",
    },
    icon: "Users",
  },
  {
    slug: "client-onboarding",
    name: "Zero-Touch Client Onboarding",
    pitch: "The moment a client signs or pays, their whole project setup happens without you touching it.",
    painPoint: {
      description:
        "Emailing back and forth for assets, creating Drive folders by hand, building a project board, sending the first invoice — one client at a time.",
      hoursPerWeek: "6–10 hrs/week",
    },
    howItWorks: [
      "A client pays or signs your agreement.",
      "A project folder and task board are created automatically.",
      "A welcome email goes out with next steps and any forms they need to fill in.",
      "You start the work already organized — no manual setup.",
    ],
    example: {
      type: "static",
      description: "Simple flow: Payment → folder and board auto-created → welcome email sent.",
    },
    icon: "FolderCheck",
  },
  {
    slug: "visual-asset-vault",
    name: "AI Visual Asset Vault",
    pitch: "Turn a shoebox of receipts and screenshots into a searchable, auto-categorized expense log — instantly.",
    painPoint: {
      description: "Renaming files, retyping receipt text by hand, and logging every expense one at a time.",
      hoursPerWeek: "5–8 hrs/week",
    },
    howItWorks: [
      "You upload a photo or screenshot of a receipt or invoice.",
      "It's automatically cleaned up and read.",
      "The important details — vendor, amount, date, category — are pulled out and logged.",
      "Everything becomes searchable: ask for \"all software expenses in June\" and get an instant answer.",
    ],
    example: {
      type: "live-demo",
      demoSlug: "visual-asset-vault",
      description: "Live demo: upload a receipt or invoice image and watch the line items land in a table.",
    },
    icon: "Receipt",
  },
  {
    slug: "inbox-copilot",
    name: "AI Inbox Copilot",
    pitch: "Auto-sort, auto-answer FAQs, and surface only the leads that matter — in real time.",
    painPoint: {
      description:
        "Sifting through email, DMs, and comments by hand — answering the same handful of questions over and over, and hoping you don't miss a real lead in the noise.",
      hoursPerWeek: "5–10 hrs/week",
    },
    howItWorks: [
      "Your inbox, DMs, and comments feed into one place.",
      "Messages are automatically sorted — spam, FAQ, or real lead.",
      "Common questions get an instant, on-brand auto-reply.",
      "Anything that needs you shows up in a daily digest, so nothing real slips through.",
    ],
    example: {
      type: "static",
      description: "Before/after: a cluttered inbox becomes a triaged view with auto-drafted replies.",
    },
    icon: "Inbox",
  },
];

export function getServiceBySlug(slug: string): ServiceOffer | undefined {
  return SERVICES.find((service) => service.slug === slug);
}
