import { test, describe, before } from "node:test";
import assert from "node:assert";
import prisma from "../lib/db";
import {
  canAccessWarehouseSop,
  createIncomingChecklist,
  getIncomingChecklists,
  createRmInwardRegisterEntry,
  getRmInwardRegisterList,
  createDetailedGrnEntry,
  getDetailedGrnList,
  exportWarehouseSopCsv,
} from "../server/services/warehouse-sop.service";
import {
  getDailyCleaningSheet,
  upsertDailyCleaningDay,
  verifyDailyCleaningMonth,
  CLEANING_AREAS,
} from "../server/services/daily-cleaning.service";

describe("9. WAREHOUSE SOP & DAILY CLEANING REGISTERS TEST SUITE", () => {
  let adminUser: any;
  let gateUser: any;
  let warehouseUser: any;
  let qaUser: any;
  let testChecklistNumber: string;
  let testGrnNumber: string;

  before(async () => {
    // 1. Fetch seed users from test database
    adminUser = await prisma.user.findUnique({
      where: { email: "admin@deepakcellulose.com" },
      include: { department: true, userRoles: { include: { role: true } } },
    });

    gateUser = await prisma.user.findUnique({
      where: { email: "gate@deepakcellulose.com" },
      include: { department: true, userRoles: { include: { role: true } } },
    });

    warehouseUser = await prisma.user.findUnique({
      where: { email: "warehouse@deepakcellulose.com" },
      include: { department: true, userRoles: { include: { role: true } } },
    });

    qaUser = await prisma.user.findUnique({
      where: { email: "qa@deepakcellulose.com" },
      include: { department: true, userRoles: { include: { role: true } } },
    });
  });

  test("9.1 Dual-Entry Access: Both Gate Operator and Warehouse Personnel have SOP recording rights", () => {
    const adminSession: any = {
      id: adminUser?.id,
      email: "admin@deepakcellulose.com",
      roles: ["SUPER_ADMIN"],
      permissions: ["*"],
    };
    const gateSession: any = {
      id: gateUser?.id,
      email: "gate@deepakcellulose.com",
      roles: ["GATE_OPERATOR"],
      permissions: ["GATE_CREATE", "GATE_READ"],
    };
    const warehouseSession: any = {
      id: warehouseUser?.id,
      email: "warehouse@deepakcellulose.com",
      roles: ["WAREHOUSE_MANAGER"],
      permissions: ["WAREHOUSE_CREATE", "WAREHOUSE_READ"],
    };
    const unauthSession: any = {
      id: "unauth-123",
      email: "visitor@external.com",
      roles: ["GUEST"],
      permissions: [],
    };

    assert.strictEqual(canAccessWarehouseSop(adminSession), true);
    assert.strictEqual(canAccessWarehouseSop(gateSession), true);
    assert.strictEqual(canAccessWarehouseSop(warehouseSession), true);
    assert.strictEqual(canAccessWarehouseSop(unauthSession), false);
    assert.strictEqual(canAccessWarehouseSop(null), false);
  });

  test("9.2 Incoming RM Checklist (ADM/SOP/02/F07): Create entry by Security Gate person upon vehicle arrival", async () => {
    const gateSession: any = {
      id: gateUser?.id || adminUser?.id,
      email: gateUser?.email || adminUser?.email,
      fullName: gateUser?.fullName || "Security Gate Officer",
      roles: ["GATE_OPERATOR"],
      permissions: ["GATE_CREATE"],
    };

    const payload = {
      date: new Date(),
      poNumber: "PO-VERBAL-TEST",
      materialName: "Paper Drum 25KG (Test)",
      standard: "In-House Specification",
      ownership: "Deepak Cellulose Pvt Ltd",
      batchNumber: "HP-TEST-99",
      quantityReceived: "250 Nos",
      totalContainers: "250 Nos",
      supplierName: "B.M. Paper Packaging",
      manufacturerName: "B.M. Paper Packaging",
      packingCondition: "OK",
      outerPackaging: "SEALED",
      drumType: "Fiber Board Drum",
      bagType: "-",
      tankerCondition: "-",
      vehicleNumber: "MH18AA9778",
      timeEntered: "10:30 AM",
      vehicleCondition: "COVERED",
      vendorApprovalStatus: "APPROVED_VENDOR",
      coaReceived: "YES",
      lrNoDate: "LR-998822 / 2026-10-22",
      remarks: "Physical gate inspection passed",
      consignmentReceivedBy: "Prem N Patel",
      checkedByQc: "Ketan M. Parmar",
      verifiedByQa: "Sankarsana Patra",
    };

    const record = await createIncomingChecklist(payload, gateSession);
    assert.ok(record.id);
    assert.ok(record.checklistNumber.startsWith("IRMC-2026-"));
    assert.strictEqual(record.materialName, "Paper Drum 25KG (Test)");
    assert.strictEqual(record.packingCondition, "OK");
    assert.strictEqual(record.vehicleNumber, "MH18AA9778");
    testChecklistNumber = record.checklistNumber;

    // Verify search and listing
    const listRes = await getIncomingChecklists({ search: "MH18AA9778" });
    assert.ok(listRes.records.length >= 1);
    const found = listRes.records.find((r) => r.checklistNumber === testChecklistNumber);
    assert.ok(found);
    assert.strictEqual(found?.materialName, "Paper Drum 25KG (Test)");
  });

  test("9.3 Raw Material Inward Register (ADM/SOP/02/F13): Log entry by Warehouse Store supervisor", async () => {
    const warehouseSession: any = {
      id: warehouseUser?.id || adminUser?.id,
      email: warehouseUser?.email || adminUser?.email,
      fullName: warehouseUser?.fullName || "Prem N Patel",
      roles: ["WAREHOUSE_MANAGER"],
      permissions: ["WAREHOUSE_CREATE"],
    };

    const payload = {
      date: new Date(),
      supplierName: "Petrochem Petrochemicals",
      challanNo: "CH-PETRO-2426",
      challanDate: new Date(),
      materialName: "Phthalic Anhydride",
      quantity: "8000 KG",
      poNumber: "PO-VERBAL-094",
      invoiceNo: "PA/26-27/03866",
      grnNo: "94-TEST",
      grnDate: new Date(),
      mfgDate: new Date("2026-09-01"),
      expDate: new Date("2027-09-01"),
      receiverSign: "Prem N Patel / 2026-10-22",
      remarks: "Purch. sc verified",
    };

    const record = await createRmInwardRegisterEntry(payload, warehouseSession);
    assert.ok(record.id);
    assert.strictEqual(record.supplierName, "Petrochem Petrochemicals");
    assert.strictEqual(record.grnNo, "94-TEST");
    assert.strictEqual(record.quantity, "8000 KG");

    const listRes = await getRmInwardRegisterList({ search: "03866" });
    assert.ok(listRes.records.length >= 1);
    const found = listRes.records.find((r) => r.invoiceNo === "PA/26-27/03866");
    assert.ok(found);
  });

  test("9.4 Goods Received Note (ADM/SOP/02/F12): Log Detailed GRN with Physical & QC verification", async () => {
    const warehouseSession: any = {
      id: warehouseUser?.id || adminUser?.id,
      email: warehouseUser?.email || adminUser?.email,
      fullName: warehouseUser?.fullName || "Prem N Patel",
      roles: ["WAREHOUSE_MANAGER"],
      permissions: ["WAREHOUSE_CREATE"],
    };

    const uniqueGrnNo = `GRN-TEST-${Date.now()}`;
    const grnPayload = {
      grnNumber: uniqueGrnNo,
      grnDate: new Date(),
      poNumber: "Verbal",
      supplierName: "B.M. Paper Packaging",
      supplierAddress: "Plot 1405, Kailash Estate, Iyava-Sanand, Ahmedabad",
      invoiceNo: "BMPP/26-27/249",
      invoiceDate: new Date("2026-09-02"),
      transporterName: "Local Cargo Transporter",
      vehicleNo: "MH18AA9778",
      deliveryChallanNo: "DC-99221",
      materialName: "Paper Drum",
      materialCode: "PM04",
      batchNumber: "HP55",
      mfgDate: new Date("2026-08-15"),
      expiryDate: new Date("2028-08-15"),
      qtyReceived: "247 Nos",
      noOfContainers: 247,
      condMaterialDamaged: false,
      condMaterialOk: true,
      packingConditionOk: true,
      labelStatusProper: true,
      quantityVerified: true,
      discrepancyObserved: "None - all seals intact",
      sampledBy: "Ketan M. Parmar",
      samplingDate: new Date("2026-09-03"),
      qcReferenceNo: "A/366/26",
      statusLabelAffixed: "APPROVED",
      storeSupervisorSign: "Prem N Patel",
      storeSupervisorDate: new Date(),
      qcReleasedBy: "Ketan M. Parmar",
      qcReleasedDate: new Date(),
      qaApprovedBy: "Sankarsana Patra",
      qaApprovedDate: new Date(),
    };

    const grn = await createDetailedGrnEntry(grnPayload, warehouseSession);
    assert.ok(grn.id);
    assert.strictEqual(grn.grnNumber, uniqueGrnNo);
    assert.strictEqual(grn.materialCode, "PM04");
    assert.strictEqual(grn.numberOfContainers, "247");
    assert.strictEqual(grn.statusLabelAffixed, "APPROVED");
    testGrnNumber = grn.grnNumber;

    const grnList = await getDetailedGrnList({ search: "PM04" });
    assert.ok(grnList.records.length >= 1);
    const found = grnList.records.find((g) => g.grnNumber === testGrnNumber);
    assert.ok(found);
    assert.strictEqual(found?.packingCondition, "OK");
  });

  test("9.5 Daily Cleaning Building Record (F10P714QA02): Upsert matrix records for all 15 building areas", async () => {
    const adminSession: any = {
      id: adminUser?.id,
      email: "admin@deepakcellulose.com",
      fullName: "Super Admin",
      roles: ["SUPER_ADMIN"],
      permissions: ["*"],
    };

    const currentMonthYear = "2026-10";
    const testDay = 25;

    // Verify 15 areas constant
    assert.strictEqual(CLEANING_AREAS.length, 15);
    assert.strictEqual(CLEANING_AREAS[0].name, "Security Cabin Area");
    assert.strictEqual(CLEANING_AREAS[1].name, "ETP Area");
    assert.strictEqual(CLEANING_AREAS[14].name, "Building No.-04 Stair case and Terrace Area");

    // Upsert day 25 cleaning record
    const record = await upsertDailyCleaningDay(
      {
        monthYear: currentMonthYear,
        dayOfMonth: testDay,
        doneBy: "Hitesh & Nitin",
        checkedBy: "Ajinath Thombare",
        verifiedByQa: "Sankarsana Patra",
        remarks: "Post-rain road and passage wash completed",
        areas: {
          securityCabinArea: true,
          etpArea: true,
          tankFarmArea: true,
          materialVehicleEntryArea: true,
          bldg1StaircaseTerrace: true,
          maintenanceRoomArea: true,
          roPlantArea: true,
          bldg2StaircaseTerrace: true,
          bldg34EastSideArea: true,
          bldg34WestSideArea: true,
          psychometricEvaporatorPassage: true,
          bldg34InBetweenArea: true,
          scrapYardArea: true,
          bldg3StaircaseTerrace: true,
          bldg4StaircaseTerrace: true,
        },
      },
      adminSession
    );

    assert.ok(record.id);
    assert.strictEqual(record.monthYear, "2026-10");
    assert.strictEqual(record.dayOfMonth, 25);
    assert.strictEqual(record.doneBy, "Hitesh & Nitin");
    assert.strictEqual(record.securityCabinArea, true);
    assert.strictEqual(record.scrapYardArea, true);

    // Retrieve month sheet
    const sheet = await getDailyCleaningSheet(currentMonthYear);
    assert.strictEqual(sheet.monthYear, "2026-10");
    assert.strictEqual(sheet.totalDaysInMonth, 31);
    assert.ok(sheet.records.length >= 1);
    const day25 = sheet.records.find((r) => r.dayOfMonth === 25);
    assert.ok(day25);
    assert.strictEqual(day25?.doneBy, "Hitesh & Nitin");
  });

  test("9.6 QA Sign-off & Audit Trail Export: Verify QA monthly sign-off and CSV export", async () => {
    const qaSession: any = {
      id: qaUser?.id || adminUser?.id,
      email: qaUser?.email || "qa@deepakcellulose.com",
      fullName: "Sankarsana Patra",
      roles: ["QA_MANAGER"],
      permissions: ["QA_APPROVE"],
    };

    // QA Month verification
    const verifiedResult = await verifyDailyCleaningMonth("2026-10", "Sankarsana Patra (Manager QA)", qaSession);
    assert.ok(verifiedResult.count >= 1);

    // Test CSV exports for Checklist, RM Inward, and GRN
    const checklistCsv = await exportWarehouseSopCsv("CHECKLIST", { search: "Paper Drum" });
    assert.ok(checklistCsv.includes("Checklist Number"));
    assert.ok(checklistCsv.includes("Material Name"));

    const inwardCsv = await exportWarehouseSopCsv("INWARD", { search: "Phthalic" });
    assert.ok(inwardCsv.includes("SR No"));
    assert.ok(inwardCsv.includes("Supplier Name"));

    const grnCsv = await exportWarehouseSopCsv("GRN", { search: "PM04" });
    assert.ok(grnCsv.includes("GRN Number"));
    assert.ok(grnCsv.includes("Material Code"));
  });
});
