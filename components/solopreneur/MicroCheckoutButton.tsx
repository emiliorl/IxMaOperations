"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createMicroSprintCheckoutSession } from "@/lib/stripe";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

interface MicroCheckoutButtonProps {
  toolSlug: string;
  toolTitle: string;
  priceAmount: number;
  className?: string;
}

export function MicroCheckoutButton({
  toolSlug,
  toolTitle,
  priceAmount,
  className,
}: MicroCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { checkoutUrl } = await createMicroSprintCheckoutSession({
        toolSlug,
        toolTitle,
        priceAmount,
      });

      if (checkoutUrl.startsWith("http")) {
        window.location.href = checkoutUrl;
      } else {
        router.push(checkoutUrl);
      }
    } catch (e) {
      console.error("Checkout dispatch error:", e);
      // Fallback
      router.push(`/onboarding/ix_ord_${Date.now()}?slug=${toolSlug}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      variant="default"
      className={`gap-2 font-semibold shadow-lg shadow-emerald-500/20 ${className || ""}`}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Securing Sprint Slot...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Launch 48-Hour Micro-Sprint (${priceAmount})
        </>
      )}
    </Button>
  );
}
