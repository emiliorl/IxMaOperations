import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { toolSlug, toolTitle, priceAmount, clientEmail } = body;
    const orderId = `ix_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes("mock")) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-06-20",
      });

      const origin =
        req.headers.get("origin") ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: toolTitle || "IxMa Micro-Sprint",
                description: "Fixed-Scope 48-Hour Engineering Micro-Sprint",
              },
              unit_amount: Math.round((priceAmount || 499) * 100), // cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        customer_email: clientEmail,
        metadata: {
          order_id: orderId,
          tool_slug: toolSlug || "custom-sprint",
        },
        success_url: `${origin}/onboarding/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/tools/${toolSlug || ""}?canceled=true`,
      });

      return NextResponse.json({
        checkoutUrl: session.url || `/onboarding/${orderId}`,
        orderId,
      });
    }

    // Seamless direct fallback for demo/development environments
    return NextResponse.json({
      checkoutUrl: `/onboarding/${orderId}?slug=${toolSlug}&mock_success=true`,
      orderId,
    });
  } catch (error: any) {
    console.error("Checkout API error:", error);
    const orderId = `ix_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return NextResponse.json({
      checkoutUrl: `/onboarding/${orderId}?mock_fallback=true`,
      orderId,
    });
  }
}
