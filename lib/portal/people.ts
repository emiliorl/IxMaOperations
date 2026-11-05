import "server-only";
import crypto from "node:crypto";
import { blindIndex, decryptLoose, encryptField } from "@/lib/field-crypto";
import { OUTGOING_URL } from "@/lib/site-url";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPortalEmail } from "@/lib/email";
import { buildBrandedEmailHtml } from "./email-template";

/**
 * Creating people and inviting them. Uses the owner-only secret key (it has
 * to: only that key can create logins) and is called ONLY from server actions
 * that have already verified the caller is the owner.
 *
 * Nobody's password is ever chosen, shown or sent by us. A new account gets a
 * random password nobody knows and a "must choose their own password" flag
 * (app_metadata, which people cannot edit). The owner then hands the person a
 * one-time invite link, which opens a page where they choose their own.
 */

/** The login for an email we already know, or null. Looked up by the keyed fingerprint, never a readable email. */
export async function findPersonByEmail(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin().from("profiles").select("id").eq("email_hash", blindIndex(email)).maybeSingle();
  return data?.id ?? null;
}

/**
 * Returns the person's id, creating their login (and encrypted profile) if
 * they don't exist yet. Null if it couldn't be done; a half-created account is
 * rolled back so it never lingers without a profile.
 */
export async function createPortalAccount(input: { email: string; displayName: string }): Promise<string | null> {
  const existing = await findPersonByEmail(input.email);
  if (existing) return existing;

  const admin = supabaseAdmin();
  const email = input.email.trim();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: crypto.randomBytes(24).toString("base64url"), // unknown to everyone; replaced by the person's own choice
    email_confirm: true,
    app_metadata: { must_change_password: true },
  });
  if (error || !data.user) {
    console.error("[people] could not create login:", error?.message);
    return null;
  }

  const profile = await admin.from("profiles").insert({
    id: data.user.id,
    display_name: encryptField(input.displayName.trim()),
    email: encryptField(email),
    email_hash: blindIndex(email),
  });
  if (profile.error) {
    console.error("[people] could not save profile — rolling back the login:", profile.error.message);
    await admin.auth.admin.deleteUser(data.user.id);
    return null;
  }
  return data.user.id;
}

/**
 * A one-time link that signs the person in and takes them to choose a
 * password. It points at OUR domain (the token is exchanged by our own route),
 * works once, and expires after Supabase's OTP lifetime (about an hour by
 * default — Authentication → Sessions/Email settings). Generate a new one any time.
 */
export async function inviteLinkFor(userId: string, locale: string): Promise<string | null> {
  const admin = supabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  const email = decryptLoose(profile?.email);
  if (!email) return null;

  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  const token = data?.properties?.hashed_token;
  if (error || !token) {
    console.error("[people] could not generate invite link:", error?.message);
    return null;
  }
  const link = new URL("/api/portal/auth/confirm", OUTGOING_URL);
  link.searchParams.set("token_hash", token);
  link.searchParams.set("type", "recovery");
  link.searchParams.set("locale", locale);
  return link.toString();
}

/**
 * Sends an onboarding / access invitation email to a user with their one-time
 * setup link. Fails safely if Resend is unconfigured or the email cannot be sent.
 */
export async function sendInviteEmailFor(input: {
  userId: string;
  locale: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = supabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("email,display_name").eq("id", input.userId).maybeSingle();
  const email = decryptLoose(profile?.email);
  const name = decryptLoose(profile?.display_name) || "";
  if (!email) return { ok: false, error: "no_email" };

  const link = await inviteLinkFor(input.userId, input.locale);
  if (!link) return { ok: false, error: "link_failed" };

  const isEs = input.locale === "es";
  const subject = isEs
    ? "Invitación a tu espacio en IxMa Operations"
    : "Invitation to your IxMa Operations workspace";

  const title = isEs ? "Activa tu cuenta de acceso" : "Activate your access account";
  const greeting = name ? (isEs ? `Hola ${name},` : `Hello ${name},`) : undefined;
  const intro = isEs
    ? "Has sido invitado a colaborar en el Portal de Operaciones de IxMa. Para comenzar, haz clic en el botón de abajo para activar tu cuenta y configurar tu contraseña privada."
    : "You have been invited to collaborate in the IxMa Operations Client Portal. To get started, click the button below to activate your account and set your private password.";

  const actionLabel = isEs ? "Activar cuenta y definir contraseña" : "Activate account and set password";
  const notice = isEs
    ? "Este enlace es de uso único y expira en 1 hora por seguridad. Si no esperabas esta invitación, puedes ignorar este mensaje."
    : "This one-time link will expire in 1 hour for security. If you were not expecting this invitation, you may safely ignore this message.";

  const html = buildBrandedEmailHtml({
    title,
    greeting,
    intro,
    action: {
      label: actionLabel,
      url: link,
    },
    notice,
    locale: isEs ? "es" : "en",
  });

  const plainGreeting = greeting ?? (isEs ? "Hola," : "Hello,");
  const text = isEs
    ? `${plainGreeting}

${intro}

Enlace de activación:
${link}

${notice}

— Equipo de IxMa Operations`
    : `${plainGreeting}

${intro}

Activation link:
${link}

${notice}

— The IxMa Operations Team`;

  const sent = await sendPortalEmail({
    to: email,
    subject,
    text,
    html,
  });

  return sent ? { ok: true } : { ok: false, error: "send_failed" };
}
