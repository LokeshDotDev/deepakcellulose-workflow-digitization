import prisma from "@/lib/db";
import { generateDocumentNumber } from "./numbering.service";
import { logAuditEvent, createNotification } from "./audit.service";
import { QCInspectionStatus, DispositionType, InventoryLotStatus, InventoryTransactionType } from "@prisma/client";

export interface RecordInspectionResultsInput {
  inspectionId: string;
  inspectorId: string;
  inspectorEmail?: string;
  inspectorName?: string;
  remarks?: string;
  results: {
    parameterId?: string;
    testName: string;
    testMethod?: string;
    expectedMin?: number;
    expectedMax?: number;
    expectedCriteria?: string;
    observedValue?: number;
    qualitativeResult?: string;
    remarks?: string;
  }[];
}

export async function recordInspectionResults(input: RecordInspectionResultsInput) {
  return await prisma.$transaction(async (tx) => {
    // Delete previous draft results if any
    await tx.qCInspectionResult.deleteMany({
      where: { inspectionId: input.inspectionId },
    });

    let allConforming = true;

    for (const res of input.results) {
      let isConforming = true;

      if (res.observedValue !== undefined && res.observedValue !== null) {
        if (res.expectedMin !== undefined && res.expectedMin !== null && res.observedValue < res.expectedMin) {
          isConforming = false;
        }
        if (res.expectedMax !== undefined && res.expectedMax !== null && res.observedValue > res.expectedMax) {
          isConforming = false;
        }
      }

      if (!isConforming) {
        allConforming = false;
      }

      await tx.qCInspectionResult.create({
        data: {
          inspectionId: input.inspectionId,
          parameterId: res.parameterId,
          testName: res.testName,
          testMethod: res.testMethod,
          expectedMin: res.expectedMin,
          expectedMax: res.expectedMax,
          expectedCriteria: res.expectedCriteria,
          observedValue: res.observedValue,
          qualitativeResult: res.qualitativeResult,
          isConforming,
          remarks: res.remarks,
        },
      });
    }

    const updatedInspection = await tx.qCInspection.update({
      where: { id: input.inspectionId },
      data: {
        status: allConforming ? QCInspectionStatus.AWAITING_APPROVAL : QCInspectionStatus.QUARANTINE_HOLD,
        inspectorId: input.inspectorId,
        remarks: input.remarks,
      },
    });

    return updatedInspection;
  });
}

export interface AuthorizeMaterialDispositionInput {
  inspectionId: string;
  disposition: DispositionType;
  authorizedById: string;
  authorizedByEmail?: string;
  authorizedByName?: string;
  reason?: string;
  remarks?: string;
}

export async function authorizeMaterialDisposition(input: AuthorizeMaterialDispositionInput) {
  return await prisma.$transaction(async (tx) => {
    const inspection = await tx.qCInspection.findUnique({
      where: { id: input.inspectionId },
      include: { lot: true },
    });

    if (!inspection || !inspection.lot) {
      throw new Error("QC Inspection or associated inventory lot not found.");
    }

    const dispositionNumber = await generateDocumentNumber("MATERIAL_DISPOSITION");
    let coaNumber = inspection.coaNumber;
    let releaseNoteNumber: string | undefined = undefined;

    let targetLotStatus: InventoryLotStatus;
    let ledgerTxnType: InventoryTransactionType;

    if (input.disposition === DispositionType.APPROVED_FOR_RELEASE) {
      targetLotStatus = InventoryLotStatus.AVAILABLE;
      ledgerTxnType = InventoryTransactionType.QC_RELEASE;
      coaNumber = coaNumber || `COA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      releaseNoteNumber = `MRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    } else if (input.disposition === DispositionType.REJECTED) {
      targetLotStatus = InventoryLotStatus.REJECTED;
      ledgerTxnType = InventoryTransactionType.QC_REJECT;
      releaseNoteNumber = `MRJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    } else {
      targetLotStatus = InventoryLotStatus.QUARANTINED;
      ledgerTxnType = InventoryTransactionType.QC_REJECT;
    }

    // 1. Create Disposition Record
    const disp = await tx.materialDisposition.create({
      data: {
        dispositionNumber,
        inspectionId: input.inspectionId,
        lotId: inspection.lot.id,
        disposition: input.disposition,
        authorizedById: input.authorizedById,
        releaseNoteNumber,
        reason: input.reason,
        remarks: input.remarks,
      },
    });

    // 2. Update QC Inspection
    await tx.qCInspection.update({
      where: { id: input.inspectionId },
      data: {
        status: input.disposition === DispositionType.APPROVED_FOR_RELEASE ? QCInspectionStatus.APPROVED : QCInspectionStatus.REJECTED,
        approvedById: input.authorizedById,
        approvedAt: new Date(),
        coaNumber,
      },
    });

    // 3. Update Inventory Lot Status Transactionally
    const oldStatus = inspection.lot.status;
    await tx.inventoryLot.update({
      where: { id: inspection.lot.id },
      data: {
        status: targetLotStatus,
      },
    });

    // 4. Append-only Inventory Ledger Movement
    const txnNumber = await generateDocumentNumber("STOCK_TRANSFER");
    await tx.inventoryLedgerEntry.create({
      data: {
        transactionNumber: txnNumber,
        transactionType: ledgerTxnType,
        materialId: inspection.lot.materialId,
        productId: inspection.lot.productId,
        lotId: inspection.lot.id,
        quantity: inspection.lot.currentQuantity,
        unit: inspection.lot.unit,
        fromWarehouseId: inspection.lot.warehouseId,
        toWarehouseId: inspection.lot.warehouseId,
        fromStatus: oldStatus,
        toStatus: targetLotStatus,
        referenceType: "QC_DISPOSITION",
        referenceId: disp.id,
        actorId: input.authorizedById,
        reason: `${input.disposition}: ${input.remarks || input.reason || "QC evaluation completed"}`,
      },
    });

    // 5. Audit Log
    await logAuditEvent({
      actorId: input.authorizedById,
      actorEmail: input.authorizedByEmail,
      actorName: input.authorizedByName,
      action: "QC_DISPOSITION",
      entityType: "MATERIAL_DISPOSITION",
      entityId: disp.id,
      documentNumber: dispositionNumber,
      details: {
        disposition: input.disposition,
        lotNumber: inspection.lot.lotNumber,
        oldStatus,
        newStatus: targetLotStatus,
        releaseNoteNumber,
      },
    });

    return disp;
  });
}
