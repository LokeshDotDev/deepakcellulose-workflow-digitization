import test, { describe } from "node:test";
import assert from "node:assert";
import prisma from "../lib/db";
import { generateDocumentNumber } from "../server/services/numbering.service";
import { consumeBatchMaterial } from "../server/services/production.service";
import { confirmDispatchAndExit } from "../server/services/dispatch.service";
import { convertUnit } from "../server/services/uom.service";
import { InventoryLotStatus, InventoryTransactionType, DispatchStatus, CustomerOrderStatus } from "@prisma/client";

describe("5. FAILURES, NEGATIVE TESTS & CONCURRENCY VALIDATION SUITE", () => {
  let testWarehouse: any;
  let testMaterial: any;
  let kgUnit: any;
  let adminUser: any;

  test("5.A Setup: Provision test master records for concurrency and boundary testing", async () => {
    adminUser = await prisma.user.findFirst({ where: { email: "admin@deepakcellulose.com" } });
    assert.ok(adminUser);

    kgUnit = await prisma.unitOfMeasure.findFirst({ where: { code: "KG" } });
    assert.ok(kgUnit);

    testWarehouse = await prisma.warehouse.findFirst();
    assert.ok(testWarehouse);

    testMaterial = await prisma.material.create({
      data: {
        code: `MAT-CONC-${Date.now()}`,
        name: "Concurrency Test Chemical",
        type: "RAW_MATERIAL",
        baseUnitId: kgUnit.id,
        minStockAlert: 10,
        maxStockLimit: 1000,
      },
    });
    assert.ok(testMaterial.id);
  });

  // 1. CONCURRENT DOCUMENT NUMBER GENERATION (Zero collisions under parallel requests)
  test("5.B Concurrency: Parallel document number requests generate strictly unique numbers", async () => {
    const promises = Array.from({ length: 8 }, () => generateDocumentNumber("PURCHASE_ORDER"));
    const generatedNumbers = await Promise.all(promises);

    const uniqueNumbers = new Set(generatedNumbers);
    assert.strictEqual(
      uniqueNumbers.size,
      generatedNumbers.length,
      `All ${generatedNumbers.length} concurrently generated document numbers must be unique`
    );
  });

  // 2. CONCURRENT INVENTORY RESERVATION RACE CONDITION PREVENTION
  test("5.C Concurrency: Competing parallel reservations exceeding inventory prevent negative available balance", async () => {
    // Create lot with exactly 100 KG available
    const lotNumber = `LOT-RACE-${Date.now()}`;
    const raceLot = await prisma.inventoryLot.create({
      data: {
        lotNumber,
        materialId: testMaterial.id,
        warehouseId: testWarehouse.id,
        initialQuantity: 100,
        currentQuantity: 100,
        reservedQuantity: 0,
        unit: "KG",
        status: InventoryLotStatus.AVAILABLE,
      },
    });

    // Function to atomically attempt reserving 70 KG with row-level locking (70 + 70 = 140 > 100)
    const attemptReserve = async (qty: number) => {
      return await prisma.$transaction(async (tx) => {
        const [lockedLot] = await tx.$queryRaw<any[]>`
          SELECT id, "currentQuantity", "reservedQuantity" 
          FROM "InventoryLot" 
          WHERE id = ${raceLot.id} 
          FOR UPDATE
        `;
        if (!lockedLot) throw new Error("Lot not found");
        const available = Number(lockedLot.currentQuantity) - Number(lockedLot.reservedQuantity);
        if (available < qty) {
          throw new Error(`Insufficient available stock: requested ${qty}, available ${available}`);
        }
        return await tx.inventoryLot.update({
          where: { id: raceLot.id },
          data: { reservedQuantity: { increment: qty } },
        });
      });
    };

    // Fire 2 simultaneous reservation requests for 70 KG each
    const results = await Promise.allSettled([attemptReserve(70), attemptReserve(70)]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.strictEqual(fulfilled.length, 1, "Exactly one concurrent reservation must succeed");
    assert.strictEqual(rejected.length, 1, "The second concurrent reservation must be rejected");

    // Final balance check: reserved must be 70, never 140
    const finalLot = await prisma.inventoryLot.findUnique({ where: { id: raceLot.id } });
    assert.strictEqual(Number(finalLot?.reservedQuantity), 70);
    assert.strictEqual(Number(finalLot?.currentQuantity), 100);
  });

  // 3. QC HOLD & QUARANTINE BYPASS BARRIER (Fail-closed)
  test("5.D Quality Gating: Attempt to consume lot in RECEIVED_PENDING_QC or REJECTED status is strictly blocked", async () => {
    // Create a lot stuck in RECEIVED_PENDING_QC
    const quarantinedLot = await prisma.inventoryLot.create({
      data: {
        lotNumber: `LOT-QUAR-${Date.now()}`,
        materialId: testMaterial.id,
        warehouseId: testWarehouse.id,
        initialQuantity: 200,
        currentQuantity: 200,
        reservedQuantity: 0,
        unit: "KG",
        status: InventoryLotStatus.RECEIVED_PENDING_QC,
      },
    });

    // Create a dummy batch to issue material to
    const batch = await prisma.batch.findFirst();
    assert.ok(batch);

    // Attempt to issue quarantined material to production batch
    await assert.rejects(
      async () => {
        await consumeBatchMaterial({
          batchId: batch.id,
          materialId: testMaterial.id,
          lotId: quarantinedLot.id,
          quantity: 50,
          unit: "KG",
          actorId: adminUser.id,
        });
      },
      (err: Error) => err.message.includes("Critical Quality Block"),
      "Production service must fail-closed when attempting to issue quarantined unreleased material"
    );

    // Verify lot quantity is untouched
    const untouchedLot = await prisma.inventoryLot.findUnique({ where: { id: quarantinedLot.id } });
    assert.strictEqual(Number(untouchedLot?.currentQuantity), 200);
  });

  // 4. DUPLICATE DISPATCH CONFIRMATION BLOCK
  test("5.E Replay Attack / Double Confirmation: Re-confirming an already dispatched challan is rejected", async () => {
    // Find any existing dispatched challan
    const existingDispatched = await prisma.dispatch.findFirst({
      where: { status: DispatchStatus.DISPATCHED },
    });

    if (existingDispatched) {
      await assert.rejects(
        async () => {
          await confirmDispatchAndExit({
            dispatchId: existingDispatched.id,
            actorId: adminUser.id,
          });
        },
        (err: Error) => err.message.includes("already been confirmed"),
        "Dispatch service must reject duplicate confirmation"
      );
    }
  });

  // 5. DATABASE TRANSACTION ATOMIC ROLLBACK
  test("5.F Transaction Integrity: Mid-transaction exception causes clean 100% rollback without partial state", async () => {
    const lotNumber = `LOT-TX-${Date.now()}`;
    const txLot = await prisma.inventoryLot.create({
      data: {
        lotNumber,
        materialId: testMaterial.id,
        warehouseId: testWarehouse.id,
        initialQuantity: 300,
        currentQuantity: 300,
        reservedQuantity: 0,
        unit: "KG",
        status: InventoryLotStatus.AVAILABLE,
      },
    });

    const sentinelTxnNumber = `SENTINEL-TX-${Date.now()}`;

    // Execute atomic transaction that deliberately fails after mutating the lot and creating a ledger row
    await assert.rejects(async () => {
      await prisma.$transaction(async (tx) => {
        // 1. Mutate lot
        await tx.inventoryLot.update({
          where: { id: txLot.id },
          data: { currentQuantity: { decrement: 100 } },
        });

        // 2. Insert ledger row
        await tx.inventoryLedgerEntry.create({
          data: {
            transactionNumber: sentinelTxnNumber,
            transactionType: InventoryTransactionType.STOCK_ADJUSTMENT,
            materialId: testMaterial.id,
            lotId: txLot.id,
            quantity: 100,
            unit: "KG",
            referenceType: "ADJUSTMENT",
            referenceId: "DUMMY",
            reason: "Rollback verification test",
          },
        });

        // 3. Deliberately explode
        throw new Error("Simulated mid-transaction business exception");
      });
    });

    // Verify 100% rollback: lot balance must be 300 (not 200)
    const rolledBackLot = await prisma.inventoryLot.findUnique({ where: { id: txLot.id } });
    assert.strictEqual(Number(rolledBackLot?.currentQuantity), 300);

    // Verify no ledger row was committed
    const phantomRow = await prisma.inventoryLedgerEntry.findUnique({
      where: { transactionNumber: sentinelTxnNumber },
    });
    assert.strictEqual(phantomRow, null, "Sentinel ledger entry must NOT exist after rollback");
  });

  // 6. INVALID UNITS AND CONVERSIONS REJECTION
  test("5.G Unit Conversions: Missing or incompatible conversion factors are rejected cleanly", async () => {
    // Attempt to convert between incompatible or undefined units (e.g. KG to LITRE without material specific gravity)
    await assert.rejects(
      async () => {
        await convertUnit({
          fromUnitCode: "KG",
          toUnitCode: "UNDEFINED_CUSTOM_UNIT",
          quantity: 100,
        });
      },
      (err: Error) => err.message.length > 0,
      "Invalid unit conversion must throw error"
    );
  });
});
