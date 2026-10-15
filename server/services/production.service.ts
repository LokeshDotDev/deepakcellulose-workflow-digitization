import prisma from "@/lib/db";
import { generateDocumentNumber } from "./numbering.service";
import { logAuditEvent } from "./audit.service";
import { ProductionOrderStatus, BatchStatus, InventoryLotStatus, InventoryTransactionType } from "@prisma/client";

export interface CreateProductionOrderInput {
  productId: string;
  formulaId: string;
  plannedQuantity: number;
  unit: string;
  startDate?: Date;
  targetCompletionDate?: Date;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assignedSupervisorId?: string;
  notes?: string;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
}

export async function createProductionOrder(input: CreateProductionOrderInput) {
  return await prisma.$transaction(async (tx) => {
    const orderNumber = await generateDocumentNumber("PRODUCTION_ORDER");

    const order = await tx.productionOrder.create({
      data: {
        orderNumber,
        productId: input.productId,
        formulaId: input.formulaId,
        plannedQuantity: input.plannedQuantity,
        unit: input.unit,
        startDate: input.startDate,
        targetCompletionDate: input.targetCompletionDate,
        priority: input.priority || "MEDIUM",
        status: ProductionOrderStatus.PLANNED,
        assignedSupervisorId: input.assignedSupervisorId,
        notes: input.notes,
      },
    });

    await logAuditEvent({
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorName: input.actorName,
      action: "CREATE",
      entityType: "PRODUCTION_ORDER",
      entityId: order.id,
      documentNumber: orderNumber,
      details: {
        productId: input.productId,
        plannedQuantity: input.plannedQuantity,
        formulaId: input.formulaId,
      },
    });

    return order;
  });
}

export interface StartBatchInput {
  productionOrderId: string;
  operatorId: string;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
  notes?: string;
}

export async function startBatchManufacturing(input: StartBatchInput) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.productionOrder.findUnique({
      where: { id: input.productionOrderId },
      include: {
        formula: {
          include: {
            lines: { include: { material: true } },
            stages: { orderBy: { sequenceOrder: "asc" } },
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Production Order ${input.productionOrderId} not found.`);
    }

    const batchNumber = await generateDocumentNumber("BATCH");

    // Create Batch
    const batch = await tx.batch.create({
      data: {
        batchNumber,
        productionOrderId: order.id,
        formulaId: order.formulaId,
        plannedQuantity: order.plannedQuantity,
        unit: order.unit,
        status: BatchStatus.IN_PROGRESS,
        startedAt: new Date(),
        operatorId: input.operatorId,
        supervisorId: order.assignedSupervisorId,
        notes: input.notes,
      },
    });

    // Populate Batch Operations from Formula Stages
    for (const stage of order.formula.stages) {
      await tx.batchOperation.create({
        data: {
          batchId: batch.id,
          stageName: stage.stageName,
          sequenceOrder: stage.sequenceOrder,
          status: stage.sequenceOrder === 1 ? "IN_PROGRESS" : "PENDING",
          startedAt: stage.sequenceOrder === 1 ? new Date() : undefined,
        },
      });
    }

    // Update order status
    await tx.productionOrder.update({
      where: { id: order.id },
      data: { status: ProductionOrderStatus.IN_PRODUCTION },
    });

    await logAuditEvent({
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorName: input.actorName,
      action: "START_BATCH",
      entityType: "BATCH",
      entityId: batch.id,
      documentNumber: batchNumber,
      details: {
        orderNumber: order.orderNumber,
        plannedQuantity: order.plannedQuantity,
      },
    });

    return batch;
  });
}

export interface ConsumeRawMaterialInput {
  batchId: string;
  materialId: string;
  lotId: string;
  quantity: number;
  unit: string;
  plannedQuantity?: number;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
}

export async function consumeBatchMaterial(input: ConsumeRawMaterialInput) {
  return await prisma.$transaction(async (tx) => {
    // 1. Check lot availability and QC Release status!
    const lot = await tx.inventoryLot.findUnique({
      where: { id: input.lotId },
    });

    if (!lot) {
      throw new Error(`Inventory Lot ${input.lotId} not found.`);
    }

    // CRITICAL BUSINESS RULE: Material must be QC_APPROVED or AVAILABLE to be issued to production!
    if (lot.status !== InventoryLotStatus.AVAILABLE && lot.status !== InventoryLotStatus.QC_APPROVED) {
      throw new Error(
        `Critical Quality Block: Material Lot '${lot.lotNumber}' has status '${lot.status}'. Material must be QC Approved before consumption in manufacturing.`
      );
    }

    const availableQty = Number(lot.currentQuantity) - Number(lot.reservedQuantity);
    if (availableQty < input.quantity) {
      throw new Error(
        `Insufficient available quantity in Lot '${lot.lotNumber}'. Available: ${availableQty} ${lot.unit}, Requested: ${input.quantity} ${input.unit}.`
      );
    }

    const issueSlipNumber = `MIS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 2. Record Batch Material Consumption
    const planned = input.plannedQuantity || input.quantity;
    const variance = input.quantity - planned;

    const consumption = await tx.batchMaterialConsumption.create({
      data: {
        batchId: input.batchId,
        materialId: input.materialId,
        lotId: input.lotId,
        plannedQuantity: planned,
        actualQuantity: input.quantity,
        unit: input.unit,
        variance,
        issueSlipNumber,
        issuedById: input.actorId,
      },
    });

    // 3. Deduct inventory lot quantity
    await tx.inventoryLot.update({
      where: { id: input.lotId },
      data: {
        currentQuantity: { decrement: input.quantity },
      },
    });

    // 4. Append-only ledger movement
    const txnNumber = await generateDocumentNumber("STOCK_TRANSFER");
    await tx.inventoryLedgerEntry.create({
      data: {
        transactionNumber: txnNumber,
        transactionType: InventoryTransactionType.PRODUCTION_ISSUE,
        materialId: input.materialId,
        lotId: input.lotId,
        quantity: input.quantity,
        unit: input.unit,
        fromWarehouseId: lot.warehouseId,
        fromLocationId: lot.locationId,
        referenceType: "BATCH_CONSUMPTION",
        referenceId: consumption.id,
        actorId: input.actorId,
        reason: `Production issue for batch consumption. Issue slip: ${issueSlipNumber}`,
      },
    });

    await logAuditEvent({
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorName: input.actorName,
      action: "MATERIAL_ISSUE",
      entityType: "BATCH_MATERIAL_CONSUMPTION",
      entityId: consumption.id,
      documentNumber: issueSlipNumber,
      details: {
        batchId: input.batchId,
        lotNumber: lot.lotNumber,
        quantity: input.quantity,
        unit: input.unit,
        variance,
      },
    });

    return consumption;
  });
}
