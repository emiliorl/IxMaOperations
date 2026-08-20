import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IxMaOperations — Industrial AI Engineering & Autonomous Micro-Sprints",
  description:
    "Enterprise-grade Computer Vision, TensorRT Edge Inference, Multi-Agent RAG, and 48-Hour Productized Micro-Sprints for high-growth operators.",
  keywords: [
    "Computer Vision",
    "TensorRT",
    "YOLOv8",
    "Defect QA",
    "ALPR OCR",
    "AI Agency",
    "Micro-SaaS",
    "Playwright Scraper",
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
        {children}
      </body>
    </html>
  );
}
