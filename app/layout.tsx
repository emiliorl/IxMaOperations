import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "IxMaOperations — Contract Automation Work",
  description:
    "Pick a pre-scoped automation package or bring a custom project — submit a request and get a price and timeline back. Lead scraping, OCR pipelines, content repurposing, data auditing, API integrations, and custom vision models.",
  keywords: [
    "automation packages",
    "custom automation project",
    "lead scraping automation",
    "receipt OCR automation",
    "content repurposing automation",
    "data auditing script",
    "API workflow integration",
    "custom vision model",
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
