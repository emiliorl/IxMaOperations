const PRODUCTION_SITE_URL = "https://www.ixmaoperations.com";
const rawSiteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? PRODUCTION_SITE_URL).replace(/\/+$/, "");
const isLocal = /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(rawSiteUrl);
const BASE_URL = isLocal ? PRODUCTION_SITE_URL : rawSiteUrl;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface BrandedEmailOptions {
  title: string;
  badge?: string;
  greeting?: string;
  intro: string;
  action?: {
    label: string;
    url: string;
  };
  detailsHtml?: string;
  notice?: string;
  locale?: "en" | "es";
}

/**
 * Builds a responsive, dark-themed HTML email adhering to IxMa's design standards.
 * Tested for compatibility across Gmail, Apple Mail, Outlook, and web clients.
 */
export function buildBrandedEmailHtml(options: BrandedEmailOptions): string {
  const isEs = options.locale !== "en";
  const logoUrl = `${BASE_URL}/apple-icon.png`;
  const supportEmail = "eramirez@ixmaoperations.com";

  const badgeText = options.badge
    ? escapeHtml(options.badge)
    : isEs
      ? "PORTAL DE CLIENTES // ACCESO SEGURO"
      : "CLIENT PORTAL // SECURE ACCESS";

  const footerText = isEs
    ? "Sistemas, automatizaciones y optimización operativa"
    : "Systems, automations and operational optimization";

  const supportLabel = isEs ? "Soporte" : "Support";
  const fallbackLabel = isEs
    ? "Si el botón no funciona, copia y pega este enlace en tu navegador:"
    : "If the button doesn't work, copy and paste this link into your browser:";

  return `<!DOCTYPE html>
<html lang="${isEs ? "es" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #d4d4d8;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #09090b; width: 100%; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #121215; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; text-align: left;">
          
          <!-- Top Header with Logo -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #27272a; background-color: #18181b;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <img src="${logoUrl}" width="34" height="34" alt="IxMa" style="display: inline-block; vertical-align: middle; border-radius: 8px; border: 1px solid #3f3f46;" />
                    <span style="display: inline-block; vertical-align: middle; margin-left: 10px; font-size: 17px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">
                      IxMa <span style="color: #10b981;">Operations</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 8px;">
                    <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #71717a;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #ffffff; line-height: 1.35; letter-spacing: -0.01em;">
                ${escapeHtml(options.title)}
              </h1>

              ${
                options.greeting
                  ? `<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #f4f4f5;">${escapeHtml(options.greeting)}</p>`
                  : ""
              }

              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                ${escapeHtml(options.intro)}
              </p>

              ${options.detailsHtml ? `<div style="margin: 0 0 24px 0;">${options.detailsHtml}</div>` : ""}

              <!-- Primary Action Button -->
              ${
                options.action
                  ? `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #10b981;">
                    <a href="${options.action.url}" target="_blank" style="display: inline-block; padding: 13px 26px; font-size: 13px; font-weight: 600; color: #022c22; text-decoration: none; border-radius: 8px; letter-spacing: 0.01em;">
                      ${escapeHtml(options.action.label)} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct Link -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 20px; background-color: #09090b; border: 1px solid #27272a; border-radius: 6px;">
                <tr>
                  <td style="padding: 12px 14px;">
                    <p style="margin: 0 0 4px 0; font-size: 11px; color: #71717a;">${fallbackLabel}</p>
                    <a href="${options.action.url}" target="_blank" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; color: #10b981; word-break: break-all; text-decoration: none;">
                      ${options.action.url}
                    </a>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <!-- Security Notice -->
              ${
                options.notice
                  ? `
              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #71717a;">
                ${escapeHtml(options.notice)}
              </p>
              `
                  : ""
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0f0f12; border-top: 1px solid #27272a;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 12px; color: #71717a; line-height: 1.6;">
                    <strong style="color: #a1a1aa;">IxMa Operations</strong> &middot; ${footerText}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 6px; font-size: 11px; color: #52525b; line-height: 1.5;">
                    <a href="${BASE_URL}" target="_blank" style="color: #71717a; text-decoration: underline;">ixmaoperations.com</a>
                    &nbsp;&middot;&nbsp;
                    ${supportLabel}: <a href="mailto:${supportEmail}" style="color: #71717a; text-decoration: underline;">${supportEmail}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
