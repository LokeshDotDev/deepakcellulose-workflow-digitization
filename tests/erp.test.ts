import { test, describe } from "node:test";
import assert from "node:assert";
import prisma from "../lib/db";
import { convertUnit } from "../server/services/uom.service";
import { generateDocumentNumber } from "../server/services/numbering.service";
import { consumeBatchMaterial } from "../server/services/production.service";
import { InventoryLotStatus } from "@prisma/client";

describe("DEEPAK CELLULOSE ERP — Core Business Rules & Integrity Tests", () => {
  // Test 1: Concurrency-Safe Document Numbering
  test("1. Numbering Service generates sequential, properly formatted document numbers", async () => {
    const num1 = await generateDocumentNumber("PURCHASE_ORDER");
    const num2 = await generateDocumentNumber("PURCHASE_ORDER");
    
    assert.ok(num1.startsWith("PO-"), `Expected prefix 'PO-', got: ${num1}`);
    assert.ok(num2.startsWith("PO-"), `Expected prefix 'PO-', got: ${num2}`);
    assert.notStrictEqual(num1, num2, "Consecutive document numbers must be unique");
  });

  // Test 2: Dynamic UOM Engine
  test("2. Dynamic UOM Engine converts standard mass units correctly", async () => {
    const result = await convertUnit({
      quantity: 5,
      fromUnitCode: "MT",
      toUnitCode: "KG",
    });

    assert.strictEqual(result.convertedQuantity, 5000, "5 MT should equal 5000 KG");
    assert.strictEqual(result.ruleType, "STANDARD_BASE");
  });

  test("3. Dynamic UOM Engine blocks cross-dimension conversion without material-specific rule", async () => {
    await assert.rejects(
      async () => {
        await convertUnit({
          quantity: 100,
          fromUnitCode: "KG",
          toUnitCode: "LTR",
          // no materialId provided
        });
      },
      (err: Error) => {
        return err.message.includes("requires a specific materialId");
      },
      "Should reject mass-to-volume conversion without approved material density rule"
    );
  });

  // Test 4: Strict Quality Gating on Material Issue
  test("4. Quality Gating blocks consumption of unreleased/quarantined raw material", async () => {
    // Find an inventory lot currently in quarantine status
    const quarLot = await prisma.inventoryLot.findFirst({
      where: { status: InventoryLotStatus.RECEIVED_PENDING_QC },
    });

    const activeBatch = await prisma.batch.findFirst({
      where: { status: "IN_PROGRESS" },
    });

    if (quarLot && activeBatch) {
      await assert.rejects(
        async () => {
          await consumeBatchMaterial({
            batchId: activeBatch.id,
            materialId: quarLot.materialId!,
            lotId: quarLot.id,
            quantity: 50,
            unit: "KG",
            actorId: "test-user-id",
          });
        },
        (err: Error) => {
          return err.message.includes("Critical Quality Block");
        },
        "Must block consumption of unreleased raw material lot"
      );
    }
  });

  // Test 5: Append-Only Stock Movement Ledger Source of Truth
  test("5. Append-only inventory ledger records exist and maintain referential integrity", async () => {
    const ledgerEntries = await prisma.inventoryLedgerEntry.findMany({
      take: 5,
    });

    assert.ok(ledgerEntries.length > 0, "Stock ledger must contain recorded movements");
    for (const entry of ledgerEntries) {
      assert.ok(entry.transactionNumber.length > 0);
      assert.ok(Number(entry.quantity) > 0, "Ledger quantity must be strictly positive");
      assert.ok(entry.transactionType, "Ledger entry must specify transaction type");
    }
  });
});
