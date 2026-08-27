"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { RotateCw } from "lucide-react";

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
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolSlug,
          toolTitle,
          priceAmount,
        }),
      });

      const data = await res.json();

      if (data.checkoutUrl) {
        if (data.checkoutUrl.startsWith("http")) {
          window.location.href = data.checkoutUrl;
        } else {
          router.push(data.checkoutUrl);
        }
      } else {
        router.push(`/onboarding/${data.orderId || `ix_ord_${Date.now()}`}?slug=${toolSlug}`);
      }
    } catch (e) {
      console.error("Checkout dispatch error:", e);
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
      className={`font-semibold shadow-sm ${className || ""}`}
    >
      {loading ? (
        <>
          <RotateCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
          Processing...
        </>
      ) : (
        `Launch 48-Hour Sprint ($${priceAmount})`
      )}
    </Button>
  );
}
