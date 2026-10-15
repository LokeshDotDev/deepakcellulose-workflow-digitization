import prisma from "@/lib/db";
import { generateDocumentNumber } from "./numbering.service";
import { logAuditEvent } from "./audit.service";
import { ThreeWayMatchStatus, PaymentStatus } from "@prisma/client";

export interface VerifyThreeWayMatchInput {
  supplierInvoiceId: string;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
}

export async function performThreeWayMatch(input: VerifyThreeWayMatchInput) {
  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.supplierInvoice.findUnique({
      where: { id: input.supplierInvoiceId },
      include: {
        purchaseOrder: { include: { lines: true } },
        goodsReceipt: { include: { lines: true } },
        supplier: true,
      },
    });

    if (!invoice) {
      throw new Error(`Supplier Invoice ${input.supplierInvoiceId} not found.`);
    }

    if (!invoice.purchaseOrder || !invoice.goodsReceipt) {
      throw new Error("Three-way match requires both a linked Purchase Order and a Goods Receipt Note.");
    }

    const discrepancies: string[] = [];

    // 1. Compare PO Total vs Invoice Total
    const poTotal = Number(invoice.purchaseOrder.totalAmount);
    const invTotal = Number(invoice.totalAmount);

    // 2. Compare GRN received quantity vs PO ordered quantity
    const totalOrdered = invoice.purchaseOrder.lines.reduce((acc, l) => acc + Number(l.quantity), 0);
    const totalReceived = invoice.goodsReceipt.lines.reduce((acc, l) => acc + Number(l.receivedQuantity), 0);

    let matchStatus: ThreeWayMatchStatus = ThreeWayMatchStatus.MATCHED;

    if (Math.abs(poTotal - invTotal) > 1.0) {
      discrepancies.push(`Amount mismatch: PO total is ₹${poTotal}, while Invoice billed is ₹${invTotal}.`);
      matchStatus = ThreeWayMatchStatus.DISCREPANCY;
    }

    if (totalReceived > totalOrdered) {
      discrepancies.push(`Quantity overage: GRN received ${totalReceived} exceeds PO ordered ${totalOrdered}.`);
      matchStatus = ThreeWayMatchStatus.DISCREPANCY;
    }

    const discrepancyDetails = {
      evaluatedAt: new Date().toISOString(),
      poNumber: invoice.purchaseOrder.poNumber,
      grnNumber: invoice.goodsReceipt.grnNumber,
      poTotal,
      invTotal,
      totalOrdered,
      totalReceived,
      matched: matchStatus === ThreeWayMatchStatus.MATCHED,
      discrepancies,
    };

    const updated = await tx.supplierInvoice.update({
      where: { id: input.supplierInvoiceId },
      data: {
        threeWayMatchStatus: matchStatus,
        discrepancyDetails,
      },
    });

    if (matchStatus === ThreeWayMatchStatus.DISCREPANCY) {
      const recNumber = await generateDocumentNumber("STOCK_TRANSFER");
      await tx.accountsReconciliation.create({
        data: {
          reconciliationNumber: `REC-${invoice.invoiceNumber}`,
          type: "PURCHASE_3WAY_MATCH",
          documentRef: invoice.invoiceNumber,
          discrepancyAmount: Math.abs(poTotal - invTotal),
          status: "PENDING_REVIEW",
          resolutionNotes: discrepancies.join(" | "),
        },
      });
    }

    await logAuditEvent({
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorName: input.actorName,
      action: "THREE_WAY_MATCH",
      entityType: "SUPPLIER_INVOICE",
      entityId: invoice.id,
      documentNumber: invoice.invoiceNumber,
      details: discrepancyDetails,
    });

    return updated;
  });
}

export async function recordPaymentStatus(params: {
  invoiceType: "SUPPLIER" | "SALES";
  invoiceId: string;
  paymentStatus: PaymentStatus;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
  notes?: string;
}) {
  if (params.invoiceType === "SUPPLIER") {
    const updated = await prisma.supplierInvoice.update({
      where: { id: params.invoiceId },
      data: { paymentStatus: params.paymentStatus },
    });
    await logAuditEvent({
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      actorName: params.actorName,
      action: "PAYMENT_STATUS_UPDATE",
      entityType: "SUPPLIER_INVOICE",
      entityId: params.invoiceId,
      documentNumber: updated.invoiceNumber,
      details: { status: params.paymentStatus, notes: params.notes },
    });
    return updated;
  } else {
    const updated = await prisma.salesInvoice.update({
      where: { id: params.invoiceId },
      data: { paymentStatus: params.paymentStatus },
    });
    await logAuditEvent({
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      actorName: params.actorName,
      action: "PAYMENT_STATUS_UPDATE",
      entityType: "SALES_INVOICE",
      entityId: params.invoiceId,
      documentNumber: updated.invoiceNumber,
      details: { status: params.paymentStatus, notes: params.notes },
    });
    return updated;
  }
}
