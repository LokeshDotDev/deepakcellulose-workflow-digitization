import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateDocumentNumber } from "@/server/services/numbering.service";
import { logAuditEvent } from "@/server/services/audit.service";
import { CustomerOrderStatus } from "@prisma/client";

export async function GET() {
  try {
    const orders = await prisma.customerOrder.findMany({
      orderBy: { orderDate: "desc" },
      include: {
        customer: true,
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({ orders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch customer orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { customerId, customerPoNumber, requiredDeliveryDate, paymentTerms, lines } = body;

    if (!customerId || !customerPoNumber || !lines || lines.length === 0) {
      return NextResponse.json(
        { error: "Customer, Customer PO Number, and at least one order product line are required." },
        { status: 400 }
      );
    }

    const orderNumber = await generateDocumentNumber("CUSTOMER_ORDER");

    const result = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let taxAmount = 0;

      const createdLines = [];
      for (const line of lines) {
        const qty = Number(line.orderedQuantity || line.quantity);
        const price = Number(line.unitPrice);
        const taxRate = Number(line.taxRate || 18.0);

        const lineSubtotal = qty * price;
        const lineTax = (lineSubtotal * taxRate) / 100;

        subtotal += lineSubtotal;
        taxAmount += lineTax;

        createdLines.push({
          productId: line.productId,
          orderedQuantity: qty,
          remainingQuantity: qty,
          dispatchedQuantity: 0,
          unit: line.unit || "KG",
          unitPrice: price,
          taxRate,
          totalPrice: lineSubtotal + lineTax,
        });
      }

      const totalAmount = subtotal + taxAmount;

      const order = await tx.customerOrder.create({
        data: {
          orderNumber,
          customerId,
          customerPoNumber,
          requiredDeliveryDate: requiredDeliveryDate ? new Date(requiredDeliveryDate) : null,
          status: CustomerOrderStatus.CONFIRMED,
          subtotal,
          taxAmount,
          totalAmount,
          paymentTerms: paymentTerms || "Net 30 Days",
          approvedById: user.id,
          lines: {
            create: createdLines,
          },
        },
        include: { lines: { include: { product: true } }, customer: true },
      });

      await logAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        actorName: user.fullName,
        action: "CREATE_CUSTOMER_ORDER",
        entityType: "CUSTOMER_ORDER",
        entityId: order.id,
        documentNumber: orderNumber,
        details: {
          customerId,
          customerPoNumber,
          totalAmount,
          linesCount: lines.length,
        },
      });

      return order;
    });

    return NextResponse.json({ success: true, customerOrder: result });
  } catch (err: any) {
    console.error("Failed to create customer order:", err);
    return NextResponse.json({ error: err.message || "Failed to create customer order" }, { status: 500 });
  }
}
