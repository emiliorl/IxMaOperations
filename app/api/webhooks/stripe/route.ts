import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");

    // If Stripe secret key and webhook signature are configured
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && sig) {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-06-20",
      });

      let event;
      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err: any) {
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const orderId = session.metadata?.order_id;
        const toolSlug = session.metadata?.tool_slug;
        const clientEmail = session.customer_email || session.customer_details?.email;

        console.info(`[STRIPE-SUCCESS] Order ${orderId} completed for ${clientEmail} (${toolSlug})`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
