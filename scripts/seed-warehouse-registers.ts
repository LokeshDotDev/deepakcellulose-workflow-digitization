import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Warehouse & Gate SOP Registers (Checklist, RM Inward, GRN) & Daily Cleaning...");

  // Find users for attribution
  const warehouseUser = await prisma.user.findUnique({ where: { email: "warehouse@deepakcellulose.com" } });
  const gateUser = await prisma.user.findUnique({ where: { email: "gate@deepakcellulose.com" } });
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@deepakcellulose.com" } });
  const recorderId = warehouseUser?.id || gateUser?.id || adminUser?.id;

  // 1. INCOMING RAW MATERIAL CHECKLIST (ADM/SOP/02/F07)
  const checklistCount = await prisma.incomingRmChecklist.count();
  if (checklistCount === 0) {
    console.log("Seeding Incoming Raw Material Checklist...");
    await prisma.incomingRmChecklist.createMany({
      data: [
        {
          checklistNumber: "IRMC-2026-092",
          date: new Date("2026-09-03"),
          poNumber: "Verbal",
          materialName: "Paper Drum",
          standard: "In-House Specification",
          ownership: "Deepak Cellulose Pvt Ltd",
          batchNumber: "HP-55",
          quantityReceived: "274 Nos",
          totalContainers: "274 Nos",
          supplierName: "B.M. Paper Packaging",
          manufacturerName: "B.M. Paper Packaging",
          storageConditions: "Dry, Covered RM Bay 1",
          packingCondition: "OK",
          outerPackaging: "SEALED",
          drumType: "Fiber Board Drum",
          vehicleNumber: "MH 18 AA 9778",
          timeEntered: "10:30",
          challanNumber: "CH-BMPP-249",
          challanDate: new Date("2026-09-02"),
          vehicleCondition: "COVERED",
          vendorApprovalStatus: "APPROVED_VENDOR",
          coaReceived: "YES",
          lrNoDate: "YES",
          remarks: "All 274 drums physically inspected. Seals verified.",
          consignmentReceivedBy: "Prem N Patel",
          checkedByQc: "Ketan M. Parmar",
          verifiedByQa: "Sankarsana Patra",
          recordedById: recorderId,
        },
        {
          checklistNumber: "IRMC-2026-093",
          date: new Date("2026-09-03"),
          poNumber: "PO-94",
          materialName: "PHTHALIC ANHYDRIDE (Pure Flakes)",
          standard: "IP",
          ownership: "Deepak Cellulose Pvt Ltd",
          batchNumber: "PA-2026-08",
          quantityReceived: "8000 kg",
          totalContainers: "320 Bags (25kg)",
          supplierName: "I. G. Petrochemicals Ltd",
          manufacturerName: "I. G. Petrochemicals Ltd",
          storageConditions: "Palletized, moisture-protected store",
          packingCondition: "OK",
          outerPackaging: "SEALED",
          bagType: "HDPE Multiwall Bag",
          vehicleNumber: "GJ 06 AX 4110",
          timeEntered: "11:45",
          challanNumber: "PA/20-27/03866",
          challanDate: new Date("2026-09-02"),
          vehicleCondition: "COVERED",
          vendorApprovalStatus: "APPROVED_VENDOR",
          coaReceived: "YES",
          lrNoDate: "YES",
          remarks: "Bags intact, no powder leakage observed.",
          consignmentReceivedBy: "Prem N Patel",
          checkedByQc: "Ketan M. Parmar",
          verifiedByQa: "Sankarsana Patra",
          recordedById: recorderId,
        },
        {
          checklistNumber: "IRMC-2026-094",
          date: new Date("2026-09-03"),
          poNumber: "Verbal",
          materialName: "Hydrochloric Acid (Commercial 30-32%)",
          standard: "In-House Specification",
          ownership: "Deepak Cellulose Pvt Ltd",
          batchNumber: "HCL-26-09",
          quantityReceived: "800 ltr",
          totalContainers: "4 Carboys (200 Ltr)",
          supplierName: "B.D. Corporation",
          manufacturerName: "B.D. Corporation",
          storageConditions: "Acid Tank Yard / Dike Area",
          packingCondition: "OK",
          outerPackaging: "SEALED",
          drumType: "HDPE Drum",
          vehicleNumber: "GJ 01 TT 8820",
          timeEntered: "02:15",
          challanNumber: "CH7132",
          challanDate: new Date("2026-09-03"),
          vehicleCondition: "COVERED",
          vendorApprovalStatus: "APPROVED_VENDOR",
          coaReceived: "YES",
          lrNoDate: "YES",
          remarks: "Vent caps and carboy integrity checked.",
          consignmentReceivedBy: "Prem N Patel",
          checkedByQc: "Ketan M. Parmar",
          verifiedByQa: "Sankarsana Patra",
          recordedById: recorderId,
        },
      ],
    });
    console.log("✓ Incoming Raw Material Checklist seeded.");
  }

  // 2. RAW MATERIAL INWARD REGISTER (ADM/SOP/02/F13)
  const inwardCount = await prisma.rawMaterialInwardRegister.count();
  if (inwardCount === 0) {
    console.log("Seeding Raw Material Inward Register...");
    await prisma.rawMaterialInwardRegister.createMany({
      data: [
        {
          srNo: 1,
          date: new Date("2026-09-03"),
          supplierName: "B. M. Paper Packaging",
          challanNo: "-",
          challanDate: new Date("2026-09-02"),
          materialName: "Paper Drum (NOS)",
          quantity: "274 Nos",
          poNumber: "Verbal",
          invoiceNo: "BMPP/26-27/249",
          grnNo: "92",
          grnDate: new Date("2026-09-03"),
          receiverSign: "Prem N Patel / 3-9-26",
          remarks: "Purch. sc",
          recordedById: recorderId,
        },
        {
          srNo: 2,
          date: new Date("2026-09-03"),
          supplierName: "I. G. Petrochem",
          challanNo: "-",
          challanDate: new Date("2026-09-02"),
          materialName: "PHTHALIC ANHYDRIDE",
          quantity: "8000 kg",
          poNumber: "94",
          invoiceNo: "PA/20-27/03866",
          grnNo: "93",
          grnDate: new Date("2026-09-03"),
          receiverSign: "Prem N Patel / 3-9-26",
          remarks: "Purch. sc",
          recordedById: recorderId,
        },
        {
          srNo: 3,
          date: new Date("2026-09-03"),
          supplierName: "B.D. Corporation",
          challanNo: "-",
          challanDate: new Date("2026-09-03"),
          materialName: "Hydraulic Acid",
          quantity: "800 ltr",
          poNumber: "Verbal",
          invoiceNo: "CH7132",
          grnNo: "94",
          grnDate: new Date("2026-09-03"),
          receiverSign: "Prem N Patel / 3-9-26",
          remarks: "Purch. sc",
          recordedById: recorderId,
        },
        {
          srNo: 4,
          date: new Date("2026-09-05"),
          supplierName: "Haridhar Agencies",
          challanNo: "-",
          challanDate: new Date("2026-09-05"),
          materialName: "Hydrogen Peroxide (50%)",
          quantity: "2500 kg",
          poNumber: "Verbal",
          invoiceNo: "HA/712",
          grnNo: "95",
          grnDate: new Date("2026-09-05"),
          mfgDate: new Date("2026-09-01"),
          expDate: new Date("2027-09-01"),
          receiverSign: "Prem N Patel / 5-9-26",
          remarks: "Purch. sc",
          recordedById: recorderId,
        },
        {
          srNo: 5,
          date: new Date("2026-09-08"),
          supplierName: "Trader Corporation",
          challanNo: "-",
          challanDate: new Date("2026-09-07"),
          materialName: "Acetic Acid",
          quantity: "14990 kg",
          poNumber: "95",
          invoiceNo: "AP0033",
          grnNo: "96",
          grnDate: new Date("2026-09-08"),
          receiverSign: "Prem N Patel / 8-9-26",
          remarks: "Purch. sc",
          recordedById: recorderId,
        },
      ],
    });
    console.log("✓ Raw Material Inward Register seeded.");
  }

  // 3. GOODS RECEIVED NOTE (GRN) (ADM/SOP/02/F12)
  const grnCount = await prisma.detailedGrn.count();
  if (grnCount === 0) {
    console.log("Seeding Goods Received Note (GRN)...");
    await prisma.detailedGrn.createMany({
      data: [
        {
          grnNumber: "92",
          grnDate: new Date("2026-09-03"),
          poNumber: "Verbal",
          supplierName: "B.M. Paper Packaging",
          supplierAddress: "Plot 1405, Kailash Estate, Iyava-Sanand, Ahmedabad",
          invoiceNo: "BMPP/26-27/249",
          invoiceDate: new Date("2026-09-02"),
          vehicleNo: "MH18AA9778",
          materialName: "Paper Drum",
          materialCode: "PM04",
          batchNumber: "HP55",
          quantityReceived: "247 Nos",
          numberOfContainers: "247",
          materialCondition: "OK",
          packingCondition: "OK",
          labelStatus: "PROPER",
          quantityVerified: "YES",
          sampledBy: "Ketan",
          samplingDate: new Date("2026-09-03"),
          qcReferenceNo: "A/366/26",
          statusLabelAffixed: "APPROVED",
          storeSupervisorSign: "Prem N Patel",
          status: "APPROVED",
          recordedById: recorderId,
        },
        {
          grnNumber: "93",
          grnDate: new Date("2026-09-03"),
          poNumber: "PO-94",
          supplierName: "I. G. Petrochem Ltd",
          supplierAddress: "Plot 22, GIDC Industrial Area, Panoli, Gujarat",
          invoiceNo: "PA/20-27/03866",
          invoiceDate: new Date("2026-09-02"),
          vehicleNo: "GJ06AX4110",
          materialName: "PHTHALIC ANHYDRIDE",
          materialCode: "RM04",
          batchNumber: "PA-2026-08",
          quantityReceived: "8000 KG",
          numberOfContainers: "320",
          materialCondition: "OK",
          packingCondition: "OK",
          labelStatus: "PROPER",
          quantityVerified: "YES",
          sampledBy: "Ketan",
          samplingDate: new Date("2026-09-03"),
          qcReferenceNo: "QC-PAN-093",
          statusLabelAffixed: "APPROVED",
          storeSupervisorSign: "Prem N Patel",
          status: "APPROVED",
          recordedById: recorderId,
        },
        {
          grnNumber: "94",
          grnDate: new Date("2026-09-03"),
          poNumber: "Verbal",
          supplierName: "B.D. Corporation",
          supplierAddress: "14, Chemical Zone, Nandesari GIDC, Vadodara",
          invoiceNo: "CH7132",
          invoiceDate: new Date("2026-09-03"),
          vehicleNo: "GJ01TT8820",
          materialName: "Hydraulic Acid (HCl 30%)",
          materialCode: "RM07",
          batchNumber: "HCL-26-09",
          quantityReceived: "800 LTR",
          numberOfContainers: "4",
          materialCondition: "OK",
          packingCondition: "OK",
          labelStatus: "PROPER",
          quantityVerified: "YES",
          sampledBy: "Ketan",
          samplingDate: new Date("2026-09-03"),
          qcReferenceNo: "QC-HCL-094",
          statusLabelAffixed: "APPROVED",
          storeSupervisorSign: "Prem N Patel",
          status: "APPROVED",
          recordedById: recorderId,
        },
      ],
    });
    console.log("✓ Goods Received Note (GRN) seeded.");
  }

  // 4. DAILY CLEANING BUILDING RECORD (F10P714QA02)
  const cleaningCount = await prisma.dailyCleaningBuildingRecord.count();
  if (cleaningCount === 0) {
    console.log("Seeding Daily Cleaning Building Record...");
    const monthYear = "2026-10";
    const daysToSeed = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    const cleaners = ["Hitesh", "Nitin", "Hitesh", "Nitin", "Hitesh", "Nitin"];

    for (let i = 0; i < daysToSeed.length; i++) {
      const day = daysToSeed[i];
      const d = new Date(2026, 9, day);
      await prisma.dailyCleaningBuildingRecord.create({
        data: {
          monthYear,
          date: d,
          dayOfMonth: day,
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
          doneBy: cleaners[i % cleaners.length],
          checkedBy: "Ajinath Thombre",
          verifiedByQa: "Sankarsana Patra",
          remarks: "Cleaning completed as per SOP P714QA02",
          recordedById: recorderId,
        },
      });
    }
    console.log("✓ Daily Cleaning Building Record seeded.");
  }

  console.log("🎉 All Warehouse, Gate SOP & Daily Cleaning records provisioned!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
