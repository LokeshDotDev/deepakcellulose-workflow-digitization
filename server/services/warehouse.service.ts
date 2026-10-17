import prisma from "@/lib/db";
import { generateDocumentNumber } from "./numbering.service";
import { logAuditEvent, createNotification } from "./audit.service";
import { GoodsReceiptStatus, InventoryLotStatus, InventoryTransactionType, GateEntryStatus, QCInspectionStatus } from "@prisma/client";

export interface CreateGoodsReceiptInput {
  gateEntryId?: string;
  purchaseOrderId?: string;
  supplierId: string;
  supplierChallanNumber: string;
  challanDate: Date;
  receiptDate?: Date;
  warehouseId: string;
  locationId?: string;
  remarks?: string;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
  lines: {
    poLineId?: string;
    materialId: string;
    declaredQuantity: number;
    receivedQuantity: number;
    unit: string;
    supplierBatchNumber?: string;
    damageShortageNotes?: string;
  }[];
}

export async function createGoodsReceipt(input: CreateGoodsReceiptInput) {
  return await prisma.$transaction(async (tx) => {
    const grnNumber = await generateDocumentNumber("GOODS_RECEIPT");

    // 1. Create Goods Receipt
    const grn = await tx.goodsReceipt.create({
      data: {
        grnNumber,
        gateEntryId: input.gateEntryId,
        purchaseOrderId: input.purchaseOrderId,
        supplierId: input.supplierId,
        supplierChallanNumber: input.supplierChallanNumber,
        challanDate: input.challanDate,
        receiptDate: input.receiptDate || new Date(),
        receivedById: input.actorId,
        status: GoodsReceiptStatus.RECEIVED_PENDING_QC,
        remarks: input.remarks,
      },
    });

    // 2. Process Lines & Create Inventory Lots & Ledger
    for (const line of input.lines) {
      const lotNumber = await generateDocumentNumber("INVENTORY_LOT");

      const grnLine = await tx.goodsReceiptLine.create({
        data: {
          goodsReceiptId: grn.id,
          poLineId: line.poLineId,
          materialId: line.materialId,
          declaredQuantity: line.declaredQuantity,
          receivedQuantity: line.receivedQuantity,
          unit: line.unit,
          warehouseId: input.warehouseId,
          locationId: input.locationId,
          supplierBatchNumber: line.supplierBatchNumber,
          damageShortageNotes: line.damageShortageNotes,
        },
      });

      // Generate incoming lot in restricted QC status
      const lot = await tx.inventoryLot.create({
        data: {
          lotNumber,
          entityType: "RAW_MATERIAL",
          materialId: line.materialId,
          initialQuantity: line.receivedQuantity,
          currentQuantity: line.receivedQuantity,
          reservedQuantity: 0,
          unit: line.unit,
          warehouseId: input.warehouseId,
          locationId: input.locationId,
          status: InventoryLotStatus.RECEIVED_PENDING_QC,
          supplierBatchNumber: line.supplierBatchNumber,
          grnLineId: grnLine.id,
          qrCode: `DC-${lotNumber}-${line.unit}-${line.receivedQuantity}`,
        },
      });

      // Append-only stock ledger entry
      const txnNumber = await generateDocumentNumber("STOCK_TRANSFER");
      await tx.inventoryLedgerEntry.create({
        data: {
          transactionNumber: txnNumber,
          transactionType: InventoryTransactionType.GRN_RECEIPT,
          materialId: line.materialId,
          lotId: lot.id,
          quantity: line.receivedQuantity,
          unit: line.unit,
          toWarehouseId: input.warehouseId,
          toLocationId: input.locationId,
          toStatus: InventoryLotStatus.RECEIVED_PENDING_QC,
          referenceType: "GOODS_RECEIPT",
          referenceId: grn.id,
          actorId: input.actorId,
          reason: `GRN ${grnNumber} inbound receipt pending QC`,
        },
      });

      // Update PO line received quantity if applicable
      if (line.poLineId) {
        await tx.purchaseOrderLine.update({
          where: { id: line.poLineId },
          data: {
            receivedQuantity: { increment: line.receivedQuantity },
          },
        });
      }

      // Automatically create a QC Inspection task for the received lot
      const qcNumber = await generateDocumentNumber("QC_INSPECTION");
      await tx.qCInspection.create({
        data: {
          inspectionNumber: qcNumber,
          stage: "INCOMING_RM",
          lotId: lot.id,
          grnId: grn.id,
          inspectionDate: new Date(),
          status: QCInspectionStatus.PENDING,
          remarks: `Inspection generated for GRN ${grnNumber}, Lot ${lotNumber}`,
        },
      });
    }

    // 3. Update Gate Entry status if provided
    if (input.gateEntryId) {
      await tx.gateEntry.update({
        where: { id: input.gateEntryId },
        data: { status: GateEntryStatus.COMPLETED },
      });
    }

    // 4. Update PO overall status if all lines received
    if (input.purchaseOrderId) {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: input.purchaseOrderId },
        include: { lines: true },
      });
      if (po) {
        const allReceived = po.lines.every((l) => Number(l.receivedQuantity) >= Number(l.quantity));
        await tx.purchaseOrder.update({
          where: { id: input.purchaseOrderId },
          data: {
            status: allReceived ? "FULLY_RECEIVED" : "PARTIALLY_RECEIVED",
          },
        });
      }
    }

    // 5. Audit Log
    await logAuditEvent({
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorName: input.actorName,
      action: "CREATE",
      entityType: "GOODS_RECEIPT",
      entityId: grn.id,
      documentNumber: grnNumber,
      details: {
        supplierId: input.supplierId,
        challan: input.supplierChallanNumber,
        linesCount: input.lines.length,
      },
    });

    return grn;
  }, { maxWait: 15000, timeout: 30000 });
}

export async function transferStock(params: {
  lotId: string;
  toWarehouseId: string;
  toLocationId?: string;
  quantity: number;
  actorId: string;
  reason?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const lot = await tx.inventoryLot.findUnique({
      where: { id: params.lotId },
    });

    if (!lot) {
      throw new Error(`Inventory Lot not found: ${params.lotId}`);
    }

    if (Number(lot.currentQuantity) < params.quantity) {
      throw new Error(`Insufficient quantity in lot. Available: ${lot.currentQuantity}, Requested: ${params.quantity}`);
    }

    const txnNumber = await generateDocumentNumber("STOCK_TRANSFER");

    // If transferring entire lot
    if (Number(lot.currentQuantity) === params.quantity) {
      await tx.inventoryLot.update({
        where: { id: params.lotId },
        data: {
          warehouseId: params.toWarehouseId,
          locationId: params.toLocationId,
        },
      });
    } else {
      // Split lot
      await tx.inventoryLot.update({
        where: { id: params.lotId },
        data: {
          currentQuantity: { decrement: params.quantity },
        },
      });

      const newLotNumber = await generateDocumentNumber("INVENTORY_LOT");
      await tx.inventoryLot.create({
        data: {
          lotNumber: newLotNumber,
          entityType: lot.entityType,
          materialId: lot.materialId,
          productId: lot.productId,
          initialQuantity: params.quantity,
          currentQuantity: params.quantity,
          unit: lot.unit,
          warehouseId: params.toWarehouseId,
          locationId: params.toLocationId,
          status: lot.status,
          supplierBatchNumber: lot.supplierBatchNumber,
          qrCode: `DC-${newLotNumber}-${lot.unit}-${params.quantity}`,
        },
      });
    }

    // Ledger Entry
    await tx.inventoryLedgerEntry.create({
      data: {
        transactionNumber: txnNumber,
        transactionType: InventoryTransactionType.STOCK_TRANSFER,
        materialId: lot.materialId,
        productId: lot.productId,
        lotId: lot.id,
        quantity: params.quantity,
        unit: lot.unit,
        fromWarehouseId: lot.warehouseId,
        fromLocationId: lot.locationId,
        toWarehouseId: params.toWarehouseId,
        toLocationId: params.toLocationId,
        fromStatus: lot.status,
        toStatus: lot.status,
        referenceType: "STOCK_TRANSFER",
        referenceId: txnNumber,
        actorId: params.actorId,
        reason: params.reason || "Inter-warehouse stock transfer",
      },
    });

    return { success: true, txnNumber };
  }, { maxWait: 15000, timeout: 30000 });
}
