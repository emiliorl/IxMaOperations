"use client";

import React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AsyncIntakeForm } from "@/components/solopreneur/AsyncIntakeForm";

export default function OnboardingPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const orderId = (params?.orderId as string) || "ix_ord_sample";
  const slug = searchParams.get("slug") || undefined;

  return (
    <div className="py-12 container mx-auto px-4">
      <AsyncIntakeForm orderId={orderId} initialSlug={slug} />
    </div>
  );
}
