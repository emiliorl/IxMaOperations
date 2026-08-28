/**
 * app/api/request/route.ts
 *
 * Shared request endpoint (Stage 11 Task 11.3) for both the Packages path
 * ("Request This Package") and the Custom Projects path (open-ended
 * brief) — emails the submission to Emilio via Resend. Replaces the
 * separate checkout/webhook/custom-project-request routes from the
 * original v3 draft; there is no self-serve checkout to wire up
 * (PROJECT_BLUEPRINT.md Section 5).
 */
import { NextResponse } from "next/server";
import { requestSchema } from "@/lib/schemas";
import { getPackageBySlug } from "@/lib/packages";
import { sendRequestEmail } from "@/lib/email";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, packageSlug, problem, timeline, budgetRange } = parsed.data;
  const pkg = packageSlug ? getPackageBySlug(packageSlug) : undefined;

  try {
    await sendRequestEmail({
      name,
      email,
      packageName: pkg?.name,
      problem,
      timeline,
      budgetRange: budgetRange || undefined,
    });
  } catch (error) {
    console.error("Failed to send request email:", error);
    return NextResponse.json(
      { error: "Something went wrong sending your request. Please try again in a moment." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
