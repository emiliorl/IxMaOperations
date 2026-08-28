import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { ArrowRight, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact — IxMaOperations",
  description: "General contact for anything that doesn't fit the Packages or Custom Projects paths.",
};

/**
 * General fallback contact page (PROJECT_BLUEPRINT.md Section 6) — for
 * anything that doesn't fit the two main paths. Most visitors should land
 * on /packages or /custom-projects instead; this exists so the header/
 * footer "Contact" link isn't a dead end.
 */
export default function ContactPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-2xl space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">Contact</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            If your question fits a package or a custom project, those paths get you a faster reply. For
            anything else, reach out directly.
          </p>
        </div>

        <a
          href="mailto:emilio.alejandrorl19@gmail.com"
          className={buttonVariants({ size: "lg", variant: "default", className: "gap-2 w-fit" })}
        >
          <Mail className="h-4 w-4" />
          emilio.alejandrorl19@gmail.com
        </a>

        <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row gap-3">
          <Link href="/packages" className={buttonVariants({ size: "default", variant: "secondary", className: "gap-2" })}>
            Browse Packages
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/custom-projects" className={buttonVariants({ size: "default", variant: "secondary", className: "gap-2" })}>
            Describe a Custom Project
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
