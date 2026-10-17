import prisma from "@/lib/db";
import { generateDocumentNumber } from "./numbering.service";
import { logAuditEvent } from "./audit.service";
import { DispatchStatus, CustomerOrderStatus, InventoryTransactionType, InventoryLotStatus } from "@prisma/client";

export interface CreateDispatchChallanInput {
  customerOrderId: string;
  transporterName?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  lrNumber?: string;
  totalPackages?: number;
  netWeight?: number;
  grossWeight?: number;
  remarks?: string;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
  allocations: {
    customerOrderLineId: string;
    productId: string;
    finishedGoodsLotId: string;
    allocatedQuantity: number;
    unit: string;
    unitPrice: number;
  }[];
}

export async function createDispatchChallan(input: CreateDispatchChallanInput) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.findUnique({
      where: { id: input.customerOrderId },
      include: { lines: true },
    });

    if (!order) {
      throw new Error(`Customer Order ${input.customerOrderId} not found.`);
    }

    const challanNumber = await generateDocumentNumber("DISPATCH");

    // 1. Create Dispatch
    const dispatch = await tx.dispatch.create({
      data: {
        dispatchChallanNumber: challanNumber,
        customerOrderId: input.customerOrderId,
        customerId: order.customerId,
        dispatchDate: new Date(),
        status: DispatchStatus.ALLOCATED,
        transporterName: input.transporterName,
        vehicleNumber: input.vehicleNumber,
        driverName: input.driverName,
        driverPhone: input.driverPhone,
        lrNumber: input.lrNumber,
        totalPackages: input.totalPackages,
        netWeight: input.netWeight,
        grossWeight: input.grossWeight,
        remarks: input.remarks,
        preparedById: input.actorId,
      },
    });

    // 2. Process Line allocations and validate stock
    for (const alloc of input.allocations) {
      const fgLot = await tx.finishedGoodsLot.findUnique({
        where: { id: alloc.finishedGoodsLotId },
      });

      if (!fgLot) {
        throw new Error(`Finished Goods Lot ${alloc.finishedGoodsLotId} not found.`);
      }

      // Check QC status: MUST BE QC_APPROVED or AVAILABLE
      if (fgLot.status !== "QC_APPROVED" && fgLot.status !== "AVAILABLE") {
        throw new Error(
          `Dispatch Block: Finished Goods Lot '${fgLot.lotNumber}' has status '${fgLot.status}'. Unreleased goods cannot be dispatched.`
        );
      }

      const availableQty = Number(fgLot.currentQuantity) - Number(fgLot.reservedQuantity);
      if (availableQty < alloc.allocatedQuantity) {
        throw new Error(
          `Insufficient stock in Lot '${fgLot.lotNumber}'. Available: ${availableQty} ${fgLot.unit}, Requested: ${alloc.allocatedQuantity} ${alloc.unit}.`
        );
      }

      // Create Dispatch Line
      const taxRate = 18.0;
      const subtotal = alloc.allocatedQuantity * alloc.unitPrice;
      const taxAmount = (subtotal * taxRate) / 100;
      const totalPrice = subtotal + taxAmount;

      const dLine = await tx.dispatchLine.create({
        data: {
          dispatchId: dispatch.id,
          customerOrderLineId: alloc.customerOrderLineId,
          productId: alloc.productId,
          quantity: alloc.allocatedQuantity,
          unit: alloc.unit,
          unitPrice: alloc.unitPrice,
          taxRate,
          totalPrice,
        },
      });

      // Record Allocation
      await tx.dispatchLotAllocation.create({
        data: {
          dispatchLineId: dLine.id,
          finishedGoodsLotId: alloc.finishedGoodsLotId,
          allocatedQuantity: alloc.allocatedQuantity,
          unit: alloc.unit,
        },
      });

      // Reserve the stock
      await tx.finishedGoodsLot.update({
        where: { id: alloc.finishedGoodsLotId },
        data: {
          reservedQuantity: { increment: alloc.allocatedQuantity },
        },
      });
    }

    await logAuditEvent({
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorName: input.actorName,
      action: "CREATE_DISPATCH",
      entityType: "DISPATCH",
      entityId: dispatch.id,
      documentNumber: challanNumber,
      details: {
        orderNumber: order.orderNumber,
        allocationsCount: input.allocations.length,
        transporter: input.transporterName,
      },
    });

    return dispatch;
  }, { maxWait: 15000, timeout: 30000 });
}

export async function confirmDispatchAndExit(params: {
  dispatchId: string;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
}) {
  return await prisma.$transaction(
    async (tx) => {
    const dispatch = await tx.dispatch.findUnique({
      where: { id: params.dispatchId },
      include: {
        lines: {
          include: {
            allocations: {
              include: { finishedGoodsLot: true },
            },
          },
        },
        customerOrder: {
          include: { lines: true },
        },
      },
    });

    if (!dispatch) {
      throw new Error(`Dispatch ${params.dispatchId} not found.`);
    }

    if (dispatch.status === DispatchStatus.DISPATCHED) {
      throw new Error(`Dispatch ${dispatch.dispatchChallanNumber} has already been confirmed.`);
    }

    // 1. Transactionally deduct inventory and write append-only stock ledger
    for (const line of dispatch.lines) {
      for (const alloc of line.allocations) {
        // Deduct from FinishedGoodsLot
        await tx.finishedGoodsLot.update({
          where: { id: alloc.finishedGoodsLotId },
          data: {
            currentQuantity: { decrement: alloc.allocatedQuantity },
            reservedQuantity: { decrement: alloc.allocatedQuantity },
          },
        });

        // Deduct from InventoryLot if corresponding mirror exists
        const invLot = await tx.inventoryLot.findUnique({
          where: { lotNumber: alloc.finishedGoodsLot.lotNumber },
        });

        if (invLot) {
          await tx.inventoryLot.update({
            where: { id: invLot.id },
            data: {
              currentQuantity: { decrement: alloc.allocatedQuantity },
              reservedQuantity: { decrement: alloc.allocatedQuantity },
            },
          });
        }

        // Write append-only inventory ledger entry
        const txnNumber = await generateDocumentNumber("STOCK_TRANSFER");
        await tx.inventoryLedgerEntry.create({
          data: {
            transactionNumber: txnNumber,
            transactionType: InventoryTransactionType.FG_DISPATCH,
            productId: line.productId,
            lotId: invLot?.id,
            quantity: alloc.allocatedQuantity,
            unit: alloc.unit,
            fromWarehouseId: alloc.finishedGoodsLot.warehouseId,
            fromLocationId: alloc.finishedGoodsLot.locationId,
            referenceType: "DISPATCH_CHALLAN",
            referenceId: dispatch.id,
            actorId: params.actorId,
            reason: `Customer Dispatch ${dispatch.dispatchChallanNumber} for Order ${dispatch.customerOrder.orderNumber}`,
          },
        });
      }

      // Update customer order line quantities
      await tx.customerOrderLine.update({
        where: { id: line.customerOrderLineId },
        data: {
          dispatchedQuantity: { increment: line.quantity },
          remainingQuantity: { decrement: line.quantity },
        },
      });
    }

    // 2. Update dispatch status to DISPATCHED
    const updatedDispatch = await tx.dispatch.update({
      where: { id: dispatch.id },
      data: {
        status: DispatchStatus.DISPATCHED,
      },
    });

    // 3. Update customer order status
    const refreshedOrder = await tx.customerOrder.findUnique({
      where: { id: dispatch.customerOrderId },
      include: { lines: true },
    });

    if (refreshedOrder) {
      const allCompleted = refreshedOrder.lines.every((l) => Number(l.remainingQuantity) <= 0);
      await tx.customerOrder.update({
        where: { id: dispatch.customerOrderId },
        data: {
          status: allCompleted ? CustomerOrderStatus.FULLY_DISPATCHED : CustomerOrderStatus.PARTIALLY_DISPATCHED,
        },
      });
    }

    // 4. Automatically generate a Sales Invoice reference for Accounts Department
    const invNumber = await generateDocumentNumber("SALES_INVOICE");
    const subtotal = dispatch.lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unitPrice), 0);
    const taxAmount = (subtotal * 18) / 100;
    const totalAmount = subtotal + taxAmount;

    await tx.salesInvoice.create({
      data: {
        invoiceNumber: invNumber,
        customerId: dispatch.customerId,
        customerOrderId: dispatch.customerOrderId,
        dispatchId: dispatch.id,
        invoiceDate: new Date(),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 45)),
        subtotal,
        taxAmount,
        totalAmount,
        paymentStatus: "PENDING",
        notes: `Auto-generated from confirmed Dispatch Challan ${dispatch.dispatchChallanNumber}`,
      },
    });

    await logAuditEvent({
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      actorName: params.actorName,
      action: "CONFIRM_DISPATCH",
      entityType: "DISPATCH",
      entityId: dispatch.id,
      documentNumber: dispatch.dispatchChallanNumber,
      details: {
        orderNumber: dispatch.customerOrder.orderNumber,
        generatedSalesInvoice: invNumber,
      },
    });

    return { dispatch: updatedDispatch, invoiceNumber: invNumber };
  }, { maxWait: 15000, timeout: 30000 });
}
