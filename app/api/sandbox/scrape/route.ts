import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get("url") || "https://marketplace.example.com/catalog";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      sendEvent("log", {
        id: "1",
        timestamp: new Date().toLocaleTimeString(),
        level: "INFO",
        message: `[STEALTH-WORKER] Initializing headless Playwright Chromium worker for ${targetUrl}`,
      });

      await new Promise((r) => setTimeout(r, 600));

      sendEvent("log", {
        id: "2",
        timestamp: new Date().toLocaleTimeString(),
        level: "INFO",
        message: "[FINGERPRINT] Applying TLS cipher spoofing & randomized WebGL vendor profile...",
        stealthBypass: true,
      });

      await new Promise((r) => setTimeout(r, 800));

      sendEvent("log", {
        id: "3",
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        message: "[CLOUDFLARE] Turnstile challenge intercepted -> Solved stealth challenge in 320ms",
        stealthBypass: true,
      });

      await new Promise((r) => setTimeout(r, 700));

      sendEvent("log", {
        id: "4",
        timestamp: new Date().toLocaleTimeString(),
        level: "INFO",
        message: "[DOM-EXTRACT] Traversing pagination tree (Pages 1 through 5)...",
      });

      await new Promise((r) => setTimeout(r, 900));

      sendEvent("log", {
        id: "5",
        timestamp: new Date().toLocaleTimeString(),
        level: "SUCCESS",
        message: "[EXTRACTED] 42 SKU records parsed (Title, Price, Stock, Rating, Category).",
      });

      sendEvent("stats", {
        pagesScraped: 5,
        itemsExtracted: 42,
        proxiesRotated: 2,
      });

      sendEvent("done", {
        success: true,
        downloadUrl: "#",
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
