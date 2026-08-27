/**
 * Stripe SDK Integration & Server-side Utilities
 */
import Stripe from "stripe";

export const stripe =
  process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes("mock")
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-06-20",
      })
    : null;

export interface CreateCheckoutParams {
  toolSlug: string;
  toolTitle: string;
  priceAmount: number;
  clientEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}
