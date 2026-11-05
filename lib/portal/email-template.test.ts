import { describe, expect, it } from "vitest";
import { buildBrandedEmailHtml } from "./email-template";

describe("buildBrandedEmailHtml", () => {
  it("renders a responsive dark-themed email with logo, badge, action button, and footer", () => {
    const html = buildBrandedEmailHtml({
      title: "Activa tu cuenta",
      greeting: "Hola Carlos,",
      intro: "Has sido invitado a colaborar en IxMa Operations.",
      action: {
        label: "Activar cuenta",
        url: "https://www.ixmaoperations.com/api/portal/auth/confirm?token_hash=abc",
      },
      notice: "Este enlace expira en 1 hora.",
      locale: "es",
    });

    // Contains essential elements
    expect(html).toContain("apple-icon.png");
    expect(html).toContain("IxMa");
    expect(html).toContain("Operations");
    expect(html).toContain("PORTAL DE CLIENTES // ACCESO SEGURO");
    expect(html).toContain("Activa tu cuenta");
    expect(html).toContain("Hola Carlos,");
    expect(html).toContain("Activar cuenta");
    expect(html).toContain("https://www.ixmaoperations.com/api/portal/auth/confirm?token_hash=abc");
    expect(html).toContain("Este enlace expira en 1 hora.");
    expect(html).toContain("ixmaoperations.com");
    expect(html).toContain("eramirez@ixmaoperations.com");
  });

  it("supports English locale", () => {
    const html = buildBrandedEmailHtml({
      title: "Activate your account",
      intro: "You have been invited.",
      locale: "en",
    });

    expect(html).toContain("CLIENT PORTAL // SECURE ACCESS");
    expect(html).toContain("Systems, automations and operational optimization");
    expect(html).toContain("Support:");
  });
});

