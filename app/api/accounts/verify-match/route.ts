import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { performThreeWayMatch, recordPaymentStatus } from "@/server/services/accounts.service";
import { PaymentStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, supplierInvoiceId, invoiceId, invoiceType, paymentStatus } = body;

    if (action === "RECORD_PAYMENT") {
      const updated = await recordPaymentStatus({
        invoiceType: invoiceType || "SALES",
        invoiceId,
        paymentStatus: paymentStatus as PaymentStatus,
        actorId: user.id,
        actorEmail: user.email,
        actorName: user.fullName,
      });
      return NextResponse.json({ success: true, invoice: updated });
    } else {
      if (!supplierInvoiceId) {
        return NextResponse.json({ error: "Supplier invoice ID required" }, { status: 400 });
      }

      const updated = await performThreeWayMatch({
        supplierInvoiceId,
        actorId: user.id,
        actorEmail: user.email,
        actorName: user.fullName,
      });

      return NextResponse.json({ success: true, invoice: updated });
    }
  } catch (err: any) {
    console.error("Failed to process accounts action", err);
    return NextResponse.json({ error: err.message || "Failed to process accounts action" }, { status: 500 });
  }
}
