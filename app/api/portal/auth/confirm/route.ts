/**
 * /api/portal/auth/confirm?token_hash=…&type=recovery&locale=…
 *
 * Where an invite link lands. The owner generates the link (lib/portal/people.ts)
 * and sends it to the person. The token works ONCE, so opening the link must not
 * use it up by itself: chat apps and e-mail scanners (WhatsApp, Outlook, Teams…)
 * load every link they see to make a preview, and a token spent by a robot is
 * "expired" by the time the person taps it.
 *
 *   GET  shows a page with one button and spends nothing (scanners only GET);
 *   POST (the person pressing the button) exchanges the token for a signed-in
 *        session on OUR domain and sends them to choose their password.
 *
 * A bad, used or expired link goes back to sign-in with a message, revealing
 * nothing about why. (Under /api so the locale middleware leaves it alone.)
 */
import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { createSupabaseServer, supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TOKEN = /^[A-Za-z0-9_-]{10,200}$/;

const COPY = {
  en: { title: "Welcome to the Domus portal", body: "Press the button to sign in and choose your password.", button: "Continue" },
  es: { title: "Bienvenido al portal de Domus", body: "Presiona el botón para entrar y elegir tu contraseña.", button: "Continuar" },
} as const;

const NO_STORE = { "Cache-Control": "no-store" };

function redirectTo(req: Request, locale: "en" | "es", path: string) {
  const prefix = locale === "es" ? "/es" : "";
  // 303: after a POST the browser must follow with a GET.
  return NextResponse.redirect(new URL(`${prefix}${path}`, req.url), { status: 303, headers: NO_STORE });
}

const localeOf = (value: unknown): "en" | "es" => (value === "es" ? "es" : "en");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = localeOf(url.searchParams.get("locale"));
  const tokenHash = url.searchParams.get("token_hash") ?? "";
  if (!supabaseConfigured() || url.searchParams.get("type") !== "recovery" || !TOKEN.test(tokenHash)) {
    return redirectTo(req, locale, "/portal/login?error=link");
  }

  const c = COPY[locale];
  // The token is validated by the pattern above, so it is safe to put in an attribute.
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${c.title}</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#e4e4e7;font-family:system-ui,sans-serif}main{max-width:22rem;padding:2rem;text-align:center}h1{font-size:1.3rem;margin:0 0 .75rem}p{color:#a1a1aa;font-size:.95rem;line-height:1.5;margin:0 0 1.5rem}button{background:#fff;color:#09090b;border:0;border-radius:.5rem;padding:.75rem 1.5rem;font-size:1rem;font-weight:600;cursor:pointer}</style></head>
<body><main><h1>${c.title}</h1><p>${c.body}</p>
<form method="post" action="/api/portal/auth/confirm"><input type="hidden" name="token_hash" value="${tokenHash}"><input type="hidden" name="locale" value="${locale}"><button type="submit">${c.button}</button></form></main></body></html>`;
  return new NextResponse(html, {
    headers: { ...NO_STORE, "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" },
  });
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const locale = localeOf(form?.get("locale"));
  const tokenHash = typeof form?.get("token_hash") === "string" ? (form?.get("token_hash") as string) : "";
  if (!supabaseConfigured() || !TOKEN.test(tokenHash)) return redirectTo(req, locale, "/portal/login?error=link");

  const limit = await checkRateLimit("portal-auth-confirm", clientIp(req), 20, 600, { failClosed: true });
  if (!limit.allowed) return redirectTo(req, locale, "/portal/login?error=link");

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  return redirectTo(req, locale, error ? "/portal/login?error=link" : "/portal/set-password");
}
