import { test, describe } from "node:test";
import assert from "node:assert";
import prisma from "../lib/db";
import { generateDocumentNumber } from "../server/services/numbering.service";
import { createGoodsReceipt } from "../server/services/warehouse.service";
import { recordInspectionResults, authorizeMaterialDisposition } from "../server/services/qc.service";
import { createProductionOrder, startBatchManufacturing, consumeBatchMaterial } from "../server/services/production.service";
import { receiveFinishedGoods } from "../server/services/finished-goods.service";
import { createDispatchChallan, confirmDispatchAndExit } from "../server/services/dispatch.service";
import { performThreeWayMatch } from "../server/services/accounts.service";
import {
  PurchaseOrderStatus,
  GateEntryStatus,
  InventoryLotStatus,
  DispositionType,
  QCInspectionStatus,
  BatchStatus,
  DispatchStatus,
  CustomerOrderStatus,
  ThreeWayMatchStatus,
  PaymentStatus,
} from "@prisma/client";

describe("3. END-TO-END BUSINESS LIFECYCLE VERIFICATION", () => {
  // Shared state across sequential deterministic lifecycle
  let adminUser: any;
  let purchaseUser: any;
  let warehouseUser: any;
  let qcUser: any;
  let prodUser: any;
  let dispatchUser: any;
  let accountsUser: any;

  let testSupplier: any;
  let testCustomer: any;
  let testRawMaterial: any;
  let testFinishedProduct: any;
  let testWarehouse: any;
  let testLocation: any;
  let testPackagingType: any;
  let testFormula: any;
  let testQCSpec: any;

  let testPO: any;
  let testGateEntry: any;
  let testGRN: any;
  let passingLot: any;
  let failingLot: any;
  let passingInspection: any;
  let failingInspection: any;

  let testProdOrder: any;
  let testBatch: any;
  let testFGLot: any;
  let testCustomerOrder: any;
  let testDispatch: any;
  let testSupplierInvoice: any;

  // A. SETUP FIXTURES
  test("3.A Setup: Provision fictional test master records", async () => {
    adminUser = await prisma.user.findFirst({ where: { email: "admin@deepakcellulose.com" } });
    purchaseUser = await prisma.user.findFirst({ where: { email: "purchase@deepakcellulose.com" } });
    warehouseUser = await prisma.user.findFirst({ where: { email: "warehouse@deepakcellulose.com" } });
    qcUser = await prisma.user.findFirst({ where: { email: "qc@deepakcellulose.com" } });
    prodUser = await prisma.user.findFirst({ where: { email: "production@deepakcellulose.com" } });
    dispatchUser = await prisma.user.findFirst({ where: { email: "dispatch@deepakcellulose.com" } });
    accountsUser = await prisma.user.findFirst({ where: { email: "accounts@deepakcellulose.com" } });

    assert.ok(adminUser && purchaseUser && warehouseUser && qcUser && prodUser && dispatchUser && accountsUser);

    const runId = Date.now().toString().slice(-6);
    const kgUom = await prisma.unitOfMeasure.findUnique({ where: { code: "KG" } });
    assert.ok(kgUom, "KG unit of measure must exist");

    // 1. Supplier & Customer
    testSupplier = await prisma.supplier.create({
      data: {
        code: `SUP-TEST-${runId}`,
        name: `Test Chemical Vendor ${runId} Pvt Ltd`,
        gstNumber: `24AABCT${runId}A1Z5`,
        address: "GIDC Industrial Estate, Nandesari, Vadodara, Gujarat",
        email: `vendor.${runId}@testsupplier.com`,
      },
    });

    testCustomer = await prisma.customer.create({
      data: {
        code: `CUST-TEST-${runId}`,
        name: `Test Pharma Client ${runId} Ltd`,
        gstNumber: `27AABCP${runId}B1Z8`,
        billingAddress: "Nariman Point, Mumbai, Maharashtra",
        shippingAddress: "Plot 42, MIDC, Andheri East, Mumbai, Maharashtra",
        email: `procurement.${runId}@testpharma.com`,
      },
    });

    // 2. Raw Material & Finished Product
    testRawMaterial = await prisma.material.create({
      data: {
        code: `RM-TEST-${runId}`,
        name: `High-Purity Cellulose Pulp (Synthetic ${runId})`,
        type: "RAW_MATERIAL",
        baseUnitId: kgUom.id,
        category: "CELLULOSE_PULP",
        description: "Wood pulp for MCC synthesis",
        isActive: true,
      },
    });

    testFinishedProduct = await prisma.product.create({
      data: {
        code: `PRD-TEST-${runId}`,
        name: `Microcrystalline Cellulose PH-101 (Synthetic ${runId})`,
        grade: "Pharma Grade (IP/BP/USP)",
        baseUnitId: kgUom.id,
        standardBatchSize: 1000,
        isActive: true,
      },
    });

    // 3. Warehouse & Packaging
    testWarehouse = await prisma.warehouse.findFirst({ where: { type: "RAW_MATERIAL" } });
    testLocation = await prisma.warehouseLocation.findFirst({ where: { warehouseId: testWarehouse?.id } });
    testPackagingType = await prisma.packagingType.findFirst();

    assert.ok(testWarehouse && testLocation && testPackagingType);

    // 4. Formula
    testFormula = await prisma.formula.create({
      data: {
        formulaCode: `FORMULA-TEST-${runId}`,
        name: `MCC Synthesis Formula ${runId}`,
        productId: testFinishedProduct.id,
        revisionNumber: 1,
        standardBatchSize: 1000,
        unit: "KG",
        expectedYieldPercentage: 95.0,
        status: "APPROVED",
        lines: {
          create: [
            {
              materialId: testRawMaterial.id,
              standardQuantity: 1050,
              unit: "KG",
              tolerancePercentage: 2.0,
            },
          ],
        },
      },
    });

    // 5. QC Specification
    testQCSpec = await prisma.qCSpecification.create({
      data: {
        code: `QC-SPEC-RM-${runId}`,
        name: `Raw Material Inspection Spec ${runId}`,
        targetType: "RAW_MATERIAL",
        materialId: testRawMaterial.id,
        status: "APPROVED",
        parameters: {
          create: [
            {
              parameterName: "Moisture Content (LOD)",
              testMethod: "Halogen Moisture Analyzer",
              unit: "%",
              minLimit: 0.0,
              maxLimit: 7.0,
              targetValue: "4.5",
              isMandatory: true,
            },
          ],
        },
      },
    });

    assert.ok(testFormula.id && testQCSpec.id);
  });

  // B. PROCUREMENT
  test("3.B Procurement: Create and approve Purchase Order", async () => {
    const poNumber = await generateDocumentNumber("PURCHASE_ORDER");
    const kgUom = await prisma.unitOfMeasure.findUnique({ where: { code: "KG" } });
    assert.ok(kgUom);

    const orderedQty = 1000;
    const unitPrice = 150.0;
    const taxRate = 18.0;
    const subtotal = orderedQty * unitPrice;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    testPO = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: testSupplier.id,
        status: PurchaseOrderStatus.APPROVED,
        subtotal,
        taxAmount,
        totalAmount,
        currency: "INR",
        approvedById: purchaseUser.id,
        approvedAt: new Date(),
        lines: {
          create: [
            {
              materialId: testRawMaterial.id,
              quantity: orderedQty,
              unitId: kgUom.id,
              unitPrice,
              taxRate,
              totalPrice: totalAmount,
              receivedQuantity: 0,
            },
          ],
        },
      },
      include: { lines: true },
    });

    assert.ok(testPO.id);
    assert.strictEqual(testPO.status, PurchaseOrderStatus.APPROVED);
    assert.strictEqual(Number(testPO.lines[0].receivedQuantity), 0);
  });

  // C. GATE AND RECEIPT (PARTIAL INBOUND)
  test("3.C Gate & Receipt: Gate Entry and Goods Receipt (GRN) with Quarantine Gating", async () => {
    const gatePassNumber = await generateDocumentNumber("GATE_ENTRY");
    const challanNumber = `CHAL-TEST-${Date.now()}`;

    // 1. Gate Entry
    testGateEntry = await prisma.gateEntry.create({
      data: {
        gatePassNumber,
        supplierId: testSupplier.id,
        vehicleNumber: "GJ-06-DC-9999",
        driverName: "Kailash Patel",
        challanNumber,
        challanDate: new Date(),
        purchaseOrderId: testPO.id,
        weighbridgeGrossWeight: 14500,
        weighbridgeTareWeight: 9500,
        weighbridgeNetWeight: 5000,
        status: GateEntryStatus.SENT_TO_WAREHOUSE,
        securityOfficerId: adminUser.id,
      },
    });

    assert.ok(testGateEntry.id);

    // 2. Goods Receipt: Receive 600 KG of the 1000 KG PO (Partial Receipt)
    testGRN = await createGoodsReceipt({
      gateEntryId: testGateEntry.id,
      purchaseOrderId: testPO.id,
      supplierId: testSupplier.id,
      supplierChallanNumber: challanNumber,
      challanDate: new Date(),
      warehouseId: testWarehouse.id,
      locationId: testLocation.id,
      actorId: warehouseUser.id,
      actorEmail: warehouseUser.email,
      actorName: warehouseUser.fullName,
      lines: [
        {
          poLineId: testPO.lines[0].id,
          materialId: testRawMaterial.id,
          declaredQuantity: 600,
          receivedQuantity: 600,
          unit: "KG",
          supplierBatchNumber: "VEND-LOT-901",
        },
      ],
    });

    assert.ok(testGRN.id);

    // 3. Verify PO received quantity updated to 600
    const updatedPOLine = await prisma.purchaseOrderLine.findUnique({
      where: { id: testPO.lines[0].id },
    });
    assert.strictEqual(Number(updatedPOLine?.receivedQuantity), 600, "PO Line receivedQuantity must be 600");

    // 4. Verify Inventory Lot created in RECEIVED_PENDING_QC status (Quarantine Hold)
    const grnLot = await prisma.inventoryLot.findFirst({
      where: { materialId: testRawMaterial.id },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(grnLot);
    assert.strictEqual(grnLot.status, InventoryLotStatus.RECEIVED_PENDING_QC, "New incoming lot MUST be in quarantine hold");
    assert.strictEqual(Number(grnLot.currentQuantity), 600);
    passingLot = grnLot;

    // 5. Verify QC Inspection was automatically triggered
    const autoQC = await prisma.qCInspection.findFirst({
      where: { lotId: passingLot.id },
    });
    assert.ok(autoQC, "QC Inspection must be automatically scheduled upon GRN creation");
    assert.strictEqual(autoQC.status, QCInspectionStatus.PENDING);
    passingInspection = autoQC;
  });

  // D. QC & INVENTORY RELEASE GATING
  test("3.D Quality Control: Passing assay releases lot to AVAILABLE; failing assay sets REJECTED", async () => {
    // 1. Passing Assay for passingLot: Moisture = 4.2% (Acceptable: 0 - 7%)
    await recordInspectionResults({
      inspectionId: passingInspection.id,
      inspectorId: qcUser.id,
      inspectorEmail: qcUser.email,
      inspectorName: qcUser.fullName,
      results: [
        {
          testName: "Moisture Content (LOD)",
          expectedMin: 0.0,
          expectedMax: 7.0,
          observedValue: 4.2,
          qualitativeResult: "PASS",
        },
      ],
    });

    // 2. Authorize Material Disposition: APPROVED_FOR_RELEASE
    await authorizeMaterialDisposition({
      inspectionId: passingInspection.id,
      disposition: DispositionType.APPROVED_FOR_RELEASE,
      authorizedById: qcUser.id,
      authorizedByEmail: qcUser.email,
      authorizedByName: qcUser.fullName,
      remarks: "Conforms to Pharmacopeial monograph. Approved for production use.",
    });

    // 3. Verify lot status moved to AVAILABLE
    const releasedLot = await prisma.inventoryLot.findUnique({ where: { id: passingLot.id } });
    assert.strictEqual(releasedLot?.status, InventoryLotStatus.AVAILABLE, "Passing lot must transition to AVAILABLE");

    // 4. Create a second failing lot (Failing Assay: Moisture = 9.5% > 7.0% max)
    const failLotNumber = await generateDocumentNumber("INVENTORY_LOT");
    failingLot = await prisma.inventoryLot.create({
      data: {
        lotNumber: failLotNumber,
        entityType: "RAW_MATERIAL",
        materialId: testRawMaterial.id,
        initialQuantity: 200,
        currentQuantity: 200,
        reservedQuantity: 0,
        unit: "KG",
        warehouseId: testWarehouse.id,
        locationId: testLocation.id,
        status: InventoryLotStatus.RECEIVED_PENDING_QC,
        supplierBatchNumber: "VEND-FAIL-902",
      },
    });

    const qcFailNum = await generateDocumentNumber("QC_INSPECTION");
    failingInspection = await prisma.qCInspection.create({
      data: {
        inspectionNumber: qcFailNum,
        stage: "INCOMING_RM",
        lotId: failingLot.id,
        status: QCInspectionStatus.PENDING,
      },
    });

    await recordInspectionResults({
      inspectionId: failingInspection.id,
      inspectorId: qcUser.id,
      results: [
        {
          testName: "Moisture Content (LOD)",
          expectedMin: 0.0,
          expectedMax: 7.0,
          observedValue: 9.5, // OOS!
          qualitativeResult: "FAIL",
        },
      ],
    });

    await authorizeMaterialDisposition({
      inspectionId: failingInspection.id,
      disposition: DispositionType.REJECTED,
      authorizedById: qcUser.id,
      reason: "Moisture 9.5% exceeds pharmacopeial specification limit of 7.0%.",
    });

    const rejectedLot = await prisma.inventoryLot.findUnique({ where: { id: failingLot.id } });
    assert.strictEqual(rejectedLot?.status, InventoryLotStatus.REJECTED, "Failing lot must transition to REJECTED");
  });

  // E. PRODUCTION & BATCH SYNTHESIS
  test("3.E Production: Create Production Order, BMR Batch, and consume released material with fail-closed QC gating", async () => {
    // 1. Create Production Order for 500 KG
    testProdOrder = await createProductionOrder({
      productId: testFinishedProduct.id,
      formulaId: testFormula.id,
      plannedQuantity: 500,
      unit: "KG",
      assignedSupervisorId: prodUser.id,
      actorId: prodUser.id,
      actorEmail: prodUser.email,
      actorName: prodUser.fullName,
    });
    assert.ok(testProdOrder.id);

    // 2. Start Batch Manufacturing
    testBatch = await startBatchManufacturing({
      productionOrderId: testProdOrder.id,
      operatorId: prodUser.id,
      actorId: prodUser.id,
      actorEmail: prodUser.email,
      actorName: prodUser.fullName,
    });
    assert.ok(testBatch.id);
    assert.strictEqual(testBatch.status, BatchStatus.IN_PROGRESS);

    // 3. FAIL-CLOSED QUALITY GATE: Attempt to consume REJECTED lot -> MUST BE PROGRAMMATICALLY REJECTED
    await assert.rejects(
      async () => {
        await consumeBatchMaterial({
          batchId: testBatch.id,
          materialId: testRawMaterial.id,
          lotId: failingLot.id,
          quantity: 50,
          unit: "KG",
          actorId: prodUser.id,
        });
      },
      (err: Error) => err.message.includes("Critical Quality Block") || err.message.includes("QC Approved"),
      "Production Service MUST reject consumption of REJECTED or unreleased lot"
    );

    // 4. Valid consumption from AVAILABLE passingLot: consume 525 KG
    const consumption = await consumeBatchMaterial({
      batchId: testBatch.id,
      materialId: testRawMaterial.id,
      lotId: passingLot.id,
      quantity: 525,
      unit: "KG",
      plannedQuantity: 525,
      actorId: prodUser.id,
      actorEmail: prodUser.email,
      actorName: prodUser.fullName,
    });
    assert.ok(consumption.id);
    assert.strictEqual(Number(consumption.actualQuantity), 525);

    // 5. Verify remaining inventory on passingLot: 600 - 525 = 75 KG
    const updatedPassingLot = await prisma.inventoryLot.findUnique({ where: { id: passingLot.id } });
    assert.strictEqual(Number(updatedPassingLot?.currentQuantity), 75, "Lot current quantity must decrease by consumed quantity");
  });

  // F. FINISHED GOODS RECEIPT & RELEASE
  test("3.F Finished Goods: Receive synthesis yield and verify FG quarantine gating", async () => {
    // 1. Receive 490 KG Finished Goods from synthesis batch (500 KG planned -> 98% yield)
    const fgReceipt = await receiveFinishedGoods({
      batchId: testBatch.id,
      productId: testFinishedProduct.id,
      producedQuantity: 490,
      unit: "KG",
      packageCount: 10,
      packagingTypeId: testPackagingType.id,
      warehouseId: testWarehouse.id,
      locationId: testLocation.id,
      actorId: prodUser.id,
      actorEmail: prodUser.email,
      actorName: prodUser.fullName,
    });

    assert.ok(fgReceipt.receipt);
    assert.ok(fgReceipt.fgLot);

    // 2. Verify FG Lot created in PENDING_QC status
    testFGLot = await prisma.finishedGoodsLot.findUnique({ where: { id: fgReceipt.fgLot.id } });
    assert.ok(testFGLot);
    assert.strictEqual(testFGLot.status, "PENDING_QC", "New Finished Goods lot must be in PENDING_QC");
    assert.strictEqual(Number(testFGLot.currentQuantity), 490);

    // 3. DISPATCH BLOCK: Attempt to allocate unreleased FG lot -> MUST BE REJECTED
    // First create a customer order
    const orderNumber = await generateDocumentNumber("CUSTOMER_ORDER");
    testCustomerOrder = await prisma.customerOrder.create({
      data: {
        orderNumber,
        customerId: testCustomer.id,
        customerPoNumber: "CUST-PO-2026-999",
        orderDate: new Date(),
        status: CustomerOrderStatus.CONFIRMED,
        totalAmount: 122500,
        lines: {
          create: [
            {
              productId: testFinishedProduct.id,
              orderedQuantity: 400,
              unit: "KG",
              unitPrice: 250.0,
              taxRate: 18.0,
              totalPrice: 118000,
              remainingQuantity: 400,
            },
          ],
        },
      },
      include: { lines: true },
    });

    await assert.rejects(
      async () => {
        await createDispatchChallan({
          customerOrderId: testCustomerOrder.id,
          actorId: dispatchUser.id,
          allocations: [
            {
              customerOrderLineId: testCustomerOrder.lines[0].id,
              productId: testFinishedProduct.id,
              finishedGoodsLotId: testFGLot.id,
              allocatedQuantity: 400,
              unit: "KG",
              unitPrice: 250.0,
            },
          ],
        });
      },
      (err: Error) => err.message.includes("Dispatch Block: Finished Goods Lot"),
      "Dispatch Service MUST block allocation of unreleased FG lot"
    );

    // 4. Release Finished Goods Lot: simulate QA release to QC_APPROVED
    await prisma.finishedGoodsLot.update({
      where: { id: testFGLot.id },
      data: { status: "QC_APPROVED" },
    });

    const approvedFGLot = await prisma.finishedGoodsLot.findUnique({ where: { id: testFGLot.id } });
    assert.strictEqual(approvedFGLot?.status, "QC_APPROVED");
  });

  // G. CUSTOMER ORDER & OUTBOUND DISPATCH
  test("3.G Outbound Dispatch: Allocate released FG lot, confirm gate-out exit, deduct inventory, and prevent double dispatch", async () => {
    // 1. Allocate 400 KG for customer order
    testDispatch = await createDispatchChallan({
      customerOrderId: testCustomerOrder.id,
      transporterName: "Mahalaxmi Transport",
      vehicleNumber: "GJ-01-XX-1234",
      driverName: "Ramesh Kumar",
      driverPhone: "9876543210",
      totalPackages: 8,
      netWeight: 400,
      grossWeight: 420,
      actorId: dispatchUser.id,
      actorEmail: dispatchUser.email,
      actorName: dispatchUser.fullName,
      allocations: [
        {
          customerOrderLineId: testCustomerOrder.lines[0].id,
          productId: testFinishedProduct.id,
          finishedGoodsLotId: testFGLot.id,
          allocatedQuantity: 400,
          unit: "KG",
          unitPrice: 250.0,
        },
      ],
    });

    assert.ok(testDispatch.id);
    assert.strictEqual(testDispatch.status, DispatchStatus.ALLOCATED);

    // Verify stock was reserved: reservedQuantity = 400
    const reservedFGLot = await prisma.finishedGoodsLot.findUnique({ where: { id: testFGLot.id } });
    assert.strictEqual(Number(reservedFGLot?.reservedQuantity), 400);

    // 2. Confirm Dispatch and Gate-Out Exit
    const exitResult = await confirmDispatchAndExit({
      dispatchId: testDispatch.id,
      actorId: dispatchUser.id,
      actorEmail: dispatchUser.email,
      actorName: dispatchUser.fullName,
    });

    assert.strictEqual(exitResult.dispatch.status, DispatchStatus.DISPATCHED);
    assert.ok(exitResult.invoiceNumber, "Sales invoice must be automatically generated upon dispatch gate-out exit");

    // 3. Verify Inventory Deduction on FG Lot: 490 - 400 = 90 KG remaining, 0 reserved
    const postDispatchLot = await prisma.finishedGoodsLot.findUnique({ where: { id: testFGLot.id } });
    assert.strictEqual(Number(postDispatchLot?.currentQuantity), 90);
    assert.strictEqual(Number(postDispatchLot?.reservedQuantity), 0);

    // 4. DOUBLE DISPATCH PREVENTION: Confirming same dispatch again must be rejected
    await assert.rejects(
      async () => {
        await confirmDispatchAndExit({
          dispatchId: testDispatch.id,
          actorId: dispatchUser.id,
        });
      },
      (err: Error) => err.message.includes("already been confirmed"),
      "Must reject redundant second confirmation on an already dispatched delivery"
    );
  });

  // H. ACCOUNTS & 3-WAY COMMERCIAL RECONCILIATION
  test("3.H Accounts: 3-Way commercial match flags rate/quantity discrepancies", async () => {
    // 1. Matched Supplier Invoice: Bill exactly matches PO & GRN received
    // PO ordered 1000 @ 150 = 150,000 + 18% GST (27,000) = 177,000
    // GRN received 600. Supplier bills for 1000 (total PO value 177,000)
    testSupplierInvoice = await prisma.supplierInvoice.create({
      data: {
        invoiceNumber: `INV-SUP-TEST-${Date.now()}`,
        supplierId: testSupplier.id,
        invoiceDate: new Date(),
        purchaseOrderId: testPO.id,
        goodsReceiptId: testGRN.id,
        subtotal: 150000,
        taxAmount: 27000,
        totalAmount: 177000, // Matches PO total
        paymentStatus: PaymentStatus.PENDING,
        threeWayMatchStatus: ThreeWayMatchStatus.PENDING,
      },
    });

    const matchResult = await performThreeWayMatch({
      supplierInvoiceId: testSupplierInvoice.id,
      actorId: accountsUser.id,
      actorEmail: accountsUser.email,
      actorName: accountsUser.fullName,
    });

    assert.strictEqual(matchResult.threeWayMatchStatus, ThreeWayMatchStatus.MATCHED);

    // 2. Discrepant Supplier Invoice: Vendor overbilled by ₹5,000
    const discrepantInvoice = await prisma.supplierInvoice.create({
      data: {
        invoiceNumber: `INV-DISCREP-TEST-${Date.now()}`,
        supplierId: testSupplier.id,
        invoiceDate: new Date(),
        purchaseOrderId: testPO.id,
        goodsReceiptId: testGRN.id,
        subtotal: 155000, // Overbilled subtotal
        taxAmount: 27900,
        totalAmount: 182900, // Total exceeds PO total by ₹5,900
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    const discrepResult = await performThreeWayMatch({
      supplierInvoiceId: discrepantInvoice.id,
      actorId: accountsUser.id,
    });

    assert.strictEqual(discrepResult.threeWayMatchStatus, ThreeWayMatchStatus.DISCREPANCY);

    // Verify reconciliation discrepancy record was created
    const rec = await prisma.accountsReconciliation.findUnique({
      where: { reconciliationNumber: `REC-${discrepantInvoice.invoiceNumber}` },
    });
    assert.ok(rec, "Reconciliation discrepancy record must be logged for finance review");
    assert.strictEqual(Number(rec.discrepancyAmount), 5900);
  });

  // I. FINAL QUANTITATIVE RECONCILIATION
  test("3.I Final Reconciliation: Physical inventory and ledger movements mathematically balance", async () => {
    // 1. Check raw material ledger entries for testRawMaterial
    const rmMovements = await prisma.inventoryLedgerEntry.findMany({
      where: { materialId: testRawMaterial.id },
      orderBy: { timestamp: "asc" },
    });

    assert.ok(rmMovements.length >= 2, "Must have inbound GRN receipt and production issue ledger entries");

    // Inbound GRN entry
    const inbound = rmMovements.find((m) => m.transactionType === "GRN_RECEIPT");
    assert.ok(inbound);
    assert.strictEqual(Number(inbound.quantity), 600);

    // Production issue entry
    const issue = rmMovements.find((m) => m.transactionType === "PRODUCTION_ISSUE");
    assert.ok(issue);
    assert.strictEqual(Number(issue.quantity), 525);

    // Balance check: 600 inbound - 525 consumed = 75 current quantity
    const currentRMBalance = await prisma.inventoryLot.findUnique({ where: { id: passingLot.id } });
    assert.strictEqual(Number(currentRMBalance?.currentQuantity), 75);

    // 2. Check finished goods ledger movements for testFinishedProduct
    const fgMovements = await prisma.inventoryLedgerEntry.findMany({
      where: { productId: testFinishedProduct.id },
      orderBy: { timestamp: "asc" },
    });

    const fgReceipt = fgMovements.find((m) => m.transactionType === "FG_RECEIPT");
    const fgDispatch = fgMovements.find((m) => m.transactionType === "FG_DISPATCH");

    assert.ok(fgReceipt && fgDispatch);
    assert.strictEqual(Number(fgReceipt.quantity), 490);
    assert.strictEqual(Number(fgDispatch.quantity), 400);

    // Balance check: 490 produced - 400 dispatched = 90 current FG balance
    const currentFGBalance = await prisma.finishedGoodsLot.findUnique({ where: { id: testFGLot.id } });
    assert.strictEqual(Number(currentFGBalance?.currentQuantity), 90);
  });
});
