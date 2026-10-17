import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/server/services/audit.service";
import { PurchaseOrderStatus } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        lines: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    return NextResponse.json({ po });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch PO" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, supplierId, expectedDeliveryDate, paymentTerms, notes, lines } = body;

    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true, gateEntries: true, goodsReceipts: true },
    });

    if (!existingPO) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Status transition update only
      if (status && !lines && !supplierId) {
        let approvedById = existingPO.approvedById;
        let approvedAt = existingPO.approvedAt;

        if (status === "APPROVED") {
          approvedById = user.id;
          approvedAt = new Date();
        } else if (status === "DRAFT" || status === "SUBMITTED") {
          approvedById = null;
          approvedAt = null;
        }

        const po = await tx.purchaseOrder.update({
          where: { id },
          data: {
            status: status as PurchaseOrderStatus,
            approvedById,
            approvedAt,
          },
        });

        await logAuditEvent({
          actorId: user.id,
          actorEmail: user.email,
          actorName: user.fullName,
          action: `UPDATE_PO_STATUS_${status}`,
          entityType: "PURCHASE_ORDER",
          entityId: id,
          documentNumber: existingPO.poNumber,
          details: { previousStatus: existingPO.status, newStatus: status },
        });

        return po;
      }

      // 2. Full PO Edit (Details & Lines)
      let subtotal = 0;
      let taxAmount = 0;
      const createdLines = [];

      if (lines && lines.length > 0) {
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
      }

      // Delete existing lines if updating lines
      if (lines && lines.length > 0) {
        await tx.purchaseOrderLine.deleteMany({
          where: { purchaseOrderId: id },
        });
      }

      const totalAmount = subtotal + taxAmount;

      const po = await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: supplierId || existingPO.supplierId,
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : existingPO.expectedDeliveryDate,
          paymentTerms: paymentTerms !== undefined ? paymentTerms : existingPO.paymentTerms,
          notes: notes !== undefined ? notes : existingPO.notes,
          status: status ? (status as PurchaseOrderStatus) : existingPO.status,
          subtotal: lines ? subtotal : existingPO.subtotal,
          taxAmount: lines ? taxAmount : existingPO.taxAmount,
          totalAmount: lines ? totalAmount : existingPO.totalAmount,
          revisionNumber: { increment: 1 },
          lines: lines && lines.length > 0 ? { create: createdLines } : undefined,
        },
        include: { lines: true },
      });

      await logAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        actorName: user.fullName,
        action: "EDIT_PURCHASE_ORDER",
        entityType: "PURCHASE_ORDER",
        entityId: id,
        documentNumber: existingPO.poNumber,
        details: { revision: po.revisionNumber, totalAmount: po.totalAmount },
      });

      return po;
    });

    return NextResponse.json({ success: true, po: updated });
  } catch (err: any) {
    console.error("Failed to update PO:", err);
    return NextResponse.json({ error: err.message || "Failed to update PO" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        gateEntries: true,
        goodsReceipts: true,
        lines: true,
      },
    });

    if (!existingPO) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    // Guard: Prevent deletion if gate pass or GRN already recorded
    if (existingPO.gateEntries.length > 0 || existingPO.goodsReceipts.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete Purchase Order because inbound gate entries or warehouse goods receipts have already been registered against it. You may cancel the order instead.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.purchaseOrderLine.deleteMany({
        where: { purchaseOrderId: id },
      });

      await tx.purchaseOrder.delete({
        where: { id },
      });
    });

    await logAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
      action: "DELETE_PURCHASE_ORDER",
      entityType: "PURCHASE_ORDER",
      entityId: id,
      documentNumber: existingPO.poNumber,
      details: { poNumber: existingPO.poNumber },
    });

    return NextResponse.json({ success: true, message: "Purchase Order deleted successfully." });
  } catch (err: any) {
    console.error("Failed to delete PO:", err);
    return NextResponse.json({ error: err.message || "Failed to delete Purchase Order" }, { status: 500 });
  }
}
