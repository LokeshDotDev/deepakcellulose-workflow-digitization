"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RefreshCw, DollarSign, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VerifyThreeWayMatchButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerify = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/accounts/verify-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierInvoiceId: invoiceId }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to execute 3-way match");
      }
    } catch (err) {
      console.error(err);
      alert("Error verifying 3-way match");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleVerify} isLoading={loading} className="gap-1.5">
      <RefreshCw className="w-3.5 h-3.5" />
      Verify 3-Way Match
    </Button>
  );
}

export function MarkPaidButton({
  invoiceId,
  invoiceType,
  currentStatus,
}: {
  invoiceId: string;
  invoiceType: "SUPPLIER" | "SALES";
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePay = async () => {
    try {
      setLoading(true);
      const nextStatus = currentStatus === "PAID" ? "PENDING" : "PAID";
      const res = await fetch("/api/accounts/verify-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_PAYMENT",
          invoiceId,
          invoiceType,
          paymentStatus: nextStatus,
        }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update payment status");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={currentStatus === "PAID" ? "outline" : "success"}
      onClick={handlePay}
      isLoading={loading}
      className="gap-1"
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
      {currentStatus === "PAID" ? "Mark Unpaid" : "Record Payment"}
    </Button>
  );
}
