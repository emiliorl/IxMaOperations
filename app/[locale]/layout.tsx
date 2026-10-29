import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SITE_URL } from "@/lib/site-url";

/**
 * Root layout (v5 i18n pivot, Aug 29, 2026) — moved under app/[locale] so
 * every page renders under a resolved locale (next-intl's App Router
 * pattern). This is the outermost layout in the tree, so it still owns
 * <html>/<body> exactly like the old app/layout.tsx did; only the import
 * path for globals.css changed (one level up). app/api/* stays outside
 * this segment — route handlers don't need a locale or a layout.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: "Metadata" });
  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    keywords: t.raw("keywords") as string[],
    icons: {
      // PNG first: Google Search's favicon crawler only supports raster
      // formats (BMP/GIF/ICO/PNG/JPEG/PPM/TIFF), not SVG — see
      // https://developers.google.com/search/docs/appearance/favicon-in-search.
      // SVG stays listed for browsers that prefer a crisp vector icon.
      icon: [
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/logo-icon.svg", type: "image/svg+xml" },
      ],
      shortcut: "/icon-192.png",
      apple: "/apple-icon.png",
    },
  };
}

export default async function LocaleLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    children
  } = props;

  const { locale } = params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enables static rendering for this locale (next-intl App Router pattern).
  setRequestLocale(locale);

  return (
    <html lang={locale} className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <NextIntlClientProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
