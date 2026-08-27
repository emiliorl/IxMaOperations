import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "IxMaOperations — Practical Automation for Solo Operators & Creators",
  description:
    "Done-for-you automation for solo operators, freelancers, VAs, and creators — content repurposing, lead prospecting, client onboarding, receipt/media tagging, and inbox triage. See a practical example, then get a quote or book a call.",
  keywords: [
    "automation for creators",
    "automation for freelancers",
    "content repurposing",
    "lead generation automation",
    "client onboarding automation",
    "receipt OCR automation",
    "inbox automation",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
