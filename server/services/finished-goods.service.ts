import prisma from "@/lib/db";
import { generateDocumentNumber } from "./numbering.service";
import { logAuditEvent } from "./audit.service";
import { BatchStatus, ProductionOrderStatus, InventoryLotStatus, InventoryTransactionType, QCInspectionStatus } from "@prisma/client";

export interface ReceiveFinishedGoodsInput {
  batchId: string;
  productId: string;
  producedQuantity: number;
  unit: string;
  packageCount: number;
  packagingTypeId: string;
  warehouseId: string;
  locationId?: string;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
}

export async function receiveFinishedGoods(input: ReceiveFinishedGoodsInput) {
  return await prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findUnique({
      where: { id: input.batchId },
      include: { productionOrder: true },
    });

    if (!batch) {
      throw new Error(`Batch ${input.batchId} not found.`);
    }

    const receiptNumber = await generateDocumentNumber("FINISHED_GOODS_RECEIPT");
    const fgLotNumber = await generateDocumentNumber("INVENTORY_LOT");

    // Calculate yield variance
    const plannedQty = Number(batch.plannedQuantity);
    const yieldVariance = plannedQty > 0 ? ((input.producedQuantity - plannedQty) / plannedQty) * 100 : 0;

    // 1. Create FG Receipt
    const receipt = await tx.finishedGoodsReceipt.create({
      data: {
        receiptNumber,
        batchId: input.batchId,
        productId: input.productId,
        producedQuantity: input.producedQuantity,
        unit: input.unit,
        packageCount: input.packageCount,
        packagingTypeId: input.packagingTypeId,
        warehouseId: input.warehouseId,
        locationId: input.locationId,
        receivedById: input.actorId,
        qcStatus: "PENDING_QC",
      },
    });

    // 2. Create Finished Goods Lot
    const fgLot = await tx.finishedGoodsLot.create({
      data: {
        lotNumber: fgLotNumber,
        receiptId: receipt.id,
        productId: input.productId,
        initialQuantity: input.producedQuantity,
        currentQuantity: input.producedQuantity,
        reservedQuantity: 0,
        unit: input.unit,
        warehouseId: input.warehouseId,
        locationId: input.locationId,
        status: "PENDING_QC",
        manufacturingDate: new Date(),
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 3)),
      },
    });

    // 3. Mirror into InventoryLot for unified traceability & ledger
    const invLot = await tx.inventoryLot.create({
      data: {
        lotNumber: fgLotNumber,
        entityType: "FINISHED_GOODS",
        productId: input.productId,
        initialQuantity: input.producedQuantity,
        currentQuantity: input.producedQuantity,
        reservedQuantity: 0,
        unit: input.unit,
        warehouseId: input.warehouseId,
        locationId: input.locationId,
        status: InventoryLotStatus.RECEIVED_PENDING_QC,
        batchId: input.batchId,
        manufacturingDate: new Date(),
        qrCode: `DC-FG-${fgLotNumber}-${input.unit}-${input.producedQuantity}`,
      },
    });

    // 4. Append-only ledger movement
    const txnNumber = await generateDocumentNumber("STOCK_TRANSFER");
    await tx.inventoryLedgerEntry.create({
      data: {
        transactionNumber: txnNumber,
        transactionType: InventoryTransactionType.FG_RECEIPT,
        productId: input.productId,
        lotId: invLot.id,
        quantity: input.producedQuantity,
        unit: input.unit,
        toWarehouseId: input.warehouseId,
        toLocationId: input.locationId,
        toStatus: InventoryLotStatus.RECEIVED_PENDING_QC,
        referenceType: "FINISHED_GOODS_RECEIPT",
        referenceId: receipt.id,
        actorId: input.actorId,
        reason: `Batch ${batch.batchNumber} finished goods receipt pending release`,
      },
    });

    // 5. Update Batch status to COMPLETED & yield variance
    await tx.batch.update({
      where: { id: input.batchId },
      data: {
        status: BatchStatus.COMPLETED,
        actualQuantityProduced: input.producedQuantity,
        yieldVariancePercentage: yieldVariance,
        completedAt: new Date(),
      },
    });

    // Update production order to COMPLETED
    await tx.productionOrder.update({
      where: { id: batch.productionOrderId },
      data: {
        status: ProductionOrderStatus.COMPLETED,
        actualCompletionDate: new Date(),
      },
    });

    // 6. Automatically generate Finished Goods QC Inspection
    const qcNumber = await generateDocumentNumber("QC_INSPECTION");
    await tx.qCInspection.create({
      data: {
        inspectionNumber: qcNumber,
        stage: "FINISHED_GOODS",
        lotId: invLot.id,
        batchId: input.batchId,
        inspectionDate: new Date(),
        status: QCInspectionStatus.PENDING,
        remarks: `Finished goods assay & release inspection for Batch ${batch.batchNumber}, Lot ${fgLotNumber}`,
      },
    });

    await logAuditEvent({
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorName: input.actorName,
      action: "FG_RECEIPT",
      entityType: "FINISHED_GOODS_RECEIPT",
      entityId: receipt.id,
      documentNumber: receiptNumber,
      details: {
        batchNumber: batch.batchNumber,
        producedQuantity: input.producedQuantity,
        yieldVariance,
        lotNumber: fgLotNumber,
      },
    });

    return { receipt, fgLot };
  });
}
