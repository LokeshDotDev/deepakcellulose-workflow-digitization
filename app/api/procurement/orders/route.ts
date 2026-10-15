import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateDocumentNumber } from "@/server/services/numbering.service";
import { logAuditEvent } from "@/server/services/audit.service";
import { PurchaseOrderStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { supplierId, expectedDeliveryDate, paymentTerms, notes, lines } = body;

    if (!supplierId || !lines || lines.length === 0) {
      return NextResponse.json({ error: "Supplier and at least one material line required" }, { status: 400 });
    }

    const poNumber = await generateDocumentNumber("PURCHASE_ORDER");

    const result = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let taxAmount = 0;

      const createdLines = [];
      for (const line of lines) {
        const qty = Number(line.quantity);
        const price = Number(line.unitPrice);
        const taxRate = Number(line.taxRate || 18.0);

        const lineSubtotal = qty * price;
        const lineTax = (lineSubtotal * taxRate) / 100;

        subtotal += lineSubtotal;
        taxAmount += lineTax;

        createdLines.push({
          materialId: line.materialId,
          quantity: qty,
          unitId: line.unitId,
          unitPrice: price,
          taxRate,
          totalPrice: lineSubtotal + lineTax,
          notes: line.notes,
        });
      }

      const totalAmount = subtotal + taxAmount;

      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId,
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          status: PurchaseOrderStatus.APPROVED, // auto-approved in demo/direct create
          subtotal,
          taxAmount,
          totalAmount,
          currency: "INR",
          paymentTerms: paymentTerms || "Net 30 Days",
          notes,
          approvedById: user.id,
          approvedAt: new Date(),
          lines: {
            create: createdLines,
          },
        },
        include: { lines: true },
      });

      await logAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        actorName: user.fullName,
        action: "CREATE_PURCHASE_ORDER",
        entityType: "PURCHASE_ORDER",
        entityId: po.id,
        documentNumber: poNumber,
        details: { supplierId, totalAmount, linesCount: lines.length },
      });

      return po;
    });

    return NextResponse.json({ success: true, po: result });
  } catch (err: any) {
    console.error("Failed to create PO", err);
    return NextResponse.json({ error: err.message || "Failed to create PO" }, { status: 500 });
  }
}
