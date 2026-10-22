import prisma from "@/lib/db";
import { SessionUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { logAuditEvent } from "./audit.service";
import { generateCsvString } from "./hr-registry.service";

export function canAccessWarehouseSop(user: SessionUser | null): boolean {
  if (!user) return false;
  const roles = user.roles || [];
  if (roles.includes("SUPER_ADMIN") || roles.includes("ADMIN")) return true;
  if (roles.includes("WAREHOUSE_MANAGER") || roles.includes("STORES_OFFICER")) return true;
  if (roles.includes("GATE_OPERATOR") || roles.includes("SECURITY_OFFICER")) return true;
  if (roles.includes("QC_MANAGER") || roles.includes("QA_MANAGER") || roles.includes("QC_ANALYST")) return true;
  const dept = user.departmentCode;
  if (dept === "WAREHOUSE" || dept === "GATE" || dept === "ADMIN" || dept === "QC" || dept === "QA") return true;
  return user.permissions.some(
    (p) => p.startsWith("WAREHOUSE_") || p.startsWith("GATE_") || p === "*"
  );
}

// ----------------------------------------------------
// 1. INCOMING RAW MATERIAL CHECKLIST (ADM/SOP/02/F07)
// ----------------------------------------------------

export interface ChecklistFilter {
  date?: string;
  search?: string;
}

export async function getIncomingChecklists(filter: ChecklistFilter = {}) {
  const where: Prisma.IncomingRmChecklistWhereInput = {};

  if (filter.search && filter.search.trim()) {
    const s = filter.search.trim();
    where.OR = [
      { checklistNumber: { contains: s, mode: "insensitive" } },
      { materialName: { contains: s, mode: "insensitive" } },
      { supplierName: { contains: s, mode: "insensitive" } },
      { vehicleNumber: { contains: s, mode: "insensitive" } },
      { batchNumber: { contains: s, mode: "insensitive" } },
      { poNumber: { contains: s, mode: "insensitive" } },
    ];
  }

  if (filter.date) {
    const start = new Date(filter.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filter.date);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  const records = await prisma.incomingRmChecklist.findMany({
    where,
    orderBy: { date: "desc" },
    include: { recordedBy: { select: { fullName: true, employeeCode: true } } },
  });

  return {
    records,
    summary: {
      total: records.length,
      okPackingCount: records.filter((r) => r.packingCondition === "OK").length,
      approvedVendorCount: records.filter((r) => r.vendorApprovalStatus === "APPROVED_VENDOR").length,
    },
  };
}

export const getChecklists = getIncomingChecklists;

export async function createIncomingChecklist(data: any, user: SessionUser) {
  let checklistNumber = data.checklistNumber;
  if (!checklistNumber) {
    const count = await prisma.incomingRmChecklist.count();
    checklistNumber = `IRMC-2026-${String(count + 1).padStart(3, "0")}`;
  }

  const checklist = await prisma.incomingRmChecklist.create({
    data: {
      checklistNumber,
      date: data.date ? new Date(data.date) : new Date(),
      poNumber: data.poNumber || "Verbal",
      materialName: data.materialName.trim(),
      standard: data.standard || "In-House Specification",
      ownership: data.ownership || "Deepak Cellulose Pvt Ltd",
      batchNumber: data.batchNumber || null,
      quantityReceived: data.quantityReceived || null,
      mfgDate: data.mfgDate ? new Date(data.mfgDate) : null,
      expDate: data.expDate ? new Date(data.expDate) : null,
      totalContainers: data.totalContainers || null,
      supplierName: data.supplierName.trim(),
      manufacturerName: data.manufacturerName || data.supplierName.trim(),
      storageConditions: data.storageConditions || null,
      packingCondition: data.packingCondition || "OK",
      outerPackaging: data.outerPackaging || "SEALED",
      drumType: data.drumType || null,
      bagType: data.bagType || null,
      tankerSealsIntact: data.tankerSealsIntact || null,
      vehicleNumber: data.vehicleNumber.trim().toUpperCase(),
      timeEntered: data.timeEntered || null,
      challanNumber: data.challanNumber || null,
      challanDate: data.challanDate ? new Date(data.challanDate) : null,
      vehicleCondition: data.vehicleCondition || "COVERED",
      vendorApprovalStatus: data.vendorApprovalStatus || "APPROVED_VENDOR",
      coaReceived: data.coaReceived || "YES",
      lrNoDate: data.lrNoDate || "YES",
      remarks: data.remarks || null,
      consignmentReceivedBy: data.consignmentReceivedBy || user.fullName,
      checkedByQc: data.checkedByQc || null,
      verifiedByQa: data.verifiedByQa || null,
      recordedById: user.id,
    },
  });

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    actorName: user.fullName,
    action: "CREATE_RM_CHECKLIST",
    entityType: "INCOMING_RM_CHECKLIST",
    entityId: checklist.id,
    documentNumber: checklist.checklistNumber,
    details: { material: checklist.materialName, supplier: checklist.supplierName, vehicle: checklist.vehicleNumber },
  });

  return checklist;
}

// ----------------------------------------------------
// 2. RAW MATERIAL INWARD REGISTER (ADM/SOP/02/F13)
// ----------------------------------------------------

export interface RmInwardFilter {
  date?: string;
  search?: string;
}

export async function getRmInwardRegisterList(filter: RmInwardFilter = {}) {
  const where: Prisma.RawMaterialInwardRegisterWhereInput = {};

  if (filter.search && filter.search.trim()) {
    const s = filter.search.trim();
    where.OR = [
      { supplierName: { contains: s, mode: "insensitive" } },
      { materialName: { contains: s, mode: "insensitive" } },
      { challanNo: { contains: s, mode: "insensitive" } },
      { invoiceNo: { contains: s, mode: "insensitive" } },
      { grnNo: { contains: s, mode: "insensitive" } },
      { poNumber: { contains: s, mode: "insensitive" } },
    ];
  }

  if (filter.date) {
    const start = new Date(filter.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filter.date);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  const records = await prisma.rawMaterialInwardRegister.findMany({
    where,
    orderBy: [{ date: "desc" }, { srNo: "asc" }],
    include: { recordedBy: { select: { fullName: true, employeeCode: true } } },
  });

  return {
    records,
    summary: {
      total: records.length,
      grnCount: records.filter((r) => r.grnNo).length,
    },
  };
}

export const getRmInwardList = getRmInwardRegisterList;

export async function createRmInwardRegisterEntry(data: any, user: SessionUser) {
  let srNo = data.srNo;
  if (!srNo) {
    const count = await prisma.rawMaterialInwardRegister.count();
    srNo = count + 1;
  }

  const entry = await prisma.rawMaterialInwardRegister.create({
    data: {
      srNo,
      date: data.date ? new Date(data.date) : new Date(),
      supplierName: data.supplierName.trim(),
      challanNo: data.challanNo || "-",
      challanDate: data.challanDate ? new Date(data.challanDate) : null,
      materialName: data.materialName.trim(),
      quantity: data.quantity.trim(),
      poNumber: data.poNumber || "Verbal",
      invoiceNo: data.invoiceNo || "-",
      grnNo: data.grnNo ? String(data.grnNo) : null,
      grnDate: data.grnDate ? new Date(data.grnDate) : new Date(),
      mfgDate: data.mfgDate ? new Date(data.mfgDate) : null,
      expDate: data.expDate ? new Date(data.expDate) : null,
      receiverSign: data.receiverSign || `${user.fullName} / ${new Date().toLocaleDateString("en-IN")}`,
      remarks: data.remarks || "Purch. sc",
      recordedById: user.id,
    },
  });

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    actorName: user.fullName,
    action: "CREATE_RM_INWARD_REGISTER",
    entityType: "RAW_MATERIAL_INWARD_REGISTER",
    entityId: entry.id,
    details: { supplier: entry.supplierName, material: entry.materialName, grn: entry.grnNo },
  });

  return entry;
}

// ----------------------------------------------------
// 3. GOODS RECEIVED NOTE (GRN) (ADM/SOP/02/F12)
// ----------------------------------------------------

export interface DetailedGrnFilter {
  date?: string;
  status?: string;
  search?: string;
}

export async function getDetailedGrnList(filter: DetailedGrnFilter = {}) {
  const where: Prisma.DetailedGrnWhereInput = {};

  if (filter.status && filter.status !== "ALL") {
    where.status = filter.status;
  }

  if (filter.search && filter.search.trim()) {
    const s = filter.search.trim();
    where.OR = [
      { grnNumber: { contains: s, mode: "insensitive" } },
      { grnNumber: { contains: s, mode: "insensitive" } },
      { supplierName: { contains: s, mode: "insensitive" } },
      { materialName: { contains: s, mode: "insensitive" } },
      { materialCode: { contains: s, mode: "insensitive" } },
      { batchNumber: { contains: s, mode: "insensitive" } },
      { invoiceNo: { contains: s, mode: "insensitive" } },
      { vehicleNo: { contains: s, mode: "insensitive" } },
      { qcReferenceNo: { contains: s, mode: "insensitive" } },
      { poNumber: { contains: s, mode: "insensitive" } },
    ];
  }

  if (filter.date) {
    const start = new Date(filter.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filter.date);
    end.setHours(23, 59, 59, 999);
    where.grnDate = { gte: start, lte: end };
  }

  const records = await prisma.detailedGrn.findMany({
    where,
    orderBy: { grnDate: "desc" },
    include: { recordedBy: { select: { fullName: true, employeeCode: true } } },
  });

  return {
    records,
    summary: {
      total: records.length,
      approvedCount: records.filter((r) => r.status === "APPROVED" || r.statusLabelAffixed === "APPROVED").length,
      quarantineCount: records.filter((r) => r.statusLabelAffixed === "QUARANTINE").length,
    },
  };
}

export async function createDetailedGrnEntry(data: any, user: SessionUser) {
  let grnNumber = data.grnNumber;
  if (!grnNumber) {
    const count = await prisma.detailedGrn.count();
    grnNumber = String(count + 100);
  }

  const grn = await prisma.detailedGrn.create({
    data: {
      grnNumber,
      grnDate: data.grnDate ? new Date(data.grnDate) : new Date(),
      poNumber: data.poNumber || "Verbal",
      supplierName: data.supplierName.trim(),
      supplierAddress: data.supplierAddress || null,
      invoiceNo: data.invoiceNo || "-",
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
      transporterName: data.transporterName || null,
      deliveryChallanNo: data.deliveryChallanNo || null,
      vehicleNo: data.vehicleNo ? data.vehicleNo.trim().toUpperCase() : null,
      materialName: data.materialName.trim(),
      materialCode: data.materialCode || null,
      batchNumber: data.batchNumber || null,
      mfgDate: data.mfgDate ? new Date(data.mfgDate) : null,
      expDate: data.expDate ? new Date(data.expDate) : null,
      quantityReceived: data.quantityReceived || data.qtyReceived || null,
      numberOfContainers:
        data.numberOfContainers !== undefined && data.numberOfContainers !== null
          ? String(data.numberOfContainers)
          : data.noOfContainers !== undefined && data.noOfContainers !== null
          ? String(data.noOfContainers)
          : null,
      materialCondition: data.materialCondition || (data.condMaterialOk ? "OK" : "DAMAGED"),
      packingCondition: data.packingCondition || (data.packingConditionOk ? "OK" : "NOT_OK"),
      labelStatus: data.labelStatus || (data.labelStatusProper ? "PROPER" : "IMPROPER"),
      quantityVerified:
        typeof data.quantityVerified === "boolean"
          ? data.quantityVerified
            ? "YES"
            : "NO"
          : data.quantityVerified || "YES",
      discrepancyObserved: data.discrepancyObserved || null,
      sampledBy: data.sampledBy || null,
      samplingDate: data.samplingDate ? new Date(data.samplingDate) : null,
      qcReferenceNo: data.qcReferenceNo || null,
      statusLabelAffixed: data.statusLabelAffixed || "APPROVED",
      remarksDeviations: data.remarksDeviations || null,
      storeSupervisorSign: data.storeSupervisorSign || user.fullName,
      qcSamplingSign: data.qcSamplingSign || null,
      qaApprovalSign: data.qaApprovalSign || null,
      status: data.status || "APPROVED",
      recordedById: user.id,
    },
  });

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    actorName: user.fullName,
    action: "CREATE_DETAILED_GRN",
    entityType: "DETAILED_GRN",
    entityId: grn.id,
    documentNumber: grn.grnNumber,
    details: { supplier: grn.supplierName, material: grn.materialName, vehicle: grn.vehicleNo },
  });

  return grn;
}

export async function exportWarehouseSopCsv(
  type: "CHECKLIST" | "INWARD" | "GRN",
  filter: any = {}
): Promise<string> {
  if (type === "CHECKLIST") {
    const { records } = await getIncomingChecklists(filter);
    const headers = [
      "Checklist Number",
      "Date",
      "PO Number",
      "Material Name",
      "Supplier Name",
      "Batch Number",
      "Quantity Received",
      "Total Containers",
      "Packing Condition",
      "Outer Packaging",
      "Drum Type",
      "Vehicle Number",
      "Time Entered",
      "Vehicle Condition",
      "Vendor Approval",
      "COA Received",
      "LR No & Date",
      "Received By",
      "Checked By QC",
      "Verified By QA",
    ];
    const rows = records.map((r) => [
      r.checklistNumber,
      r.date ? new Date(r.date).toLocaleDateString("en-IN") : "",
      r.poNumber,
      r.materialName,
      r.supplierName,
      r.batchNumber || "",
      r.quantityReceived || "",
      r.totalContainers || "",
      r.packingCondition,
      r.outerPackaging,
      r.drumType || "",
      r.vehicleNumber,
      r.timeEntered || "",
      r.vehicleCondition,
      r.vendorApprovalStatus,
      r.coaReceived,
      r.lrNoDate,
      r.consignmentReceivedBy,
      r.checkedByQc || "",
      r.verifiedByQa || "",
    ]);
    return generateCsvString(headers, rows);
  } else if (type === "INWARD") {
    const { records } = await getRmInwardRegisterList(filter);
    const headers = [
      "SR No",
      "Date",
      "Supplier Name",
      "Challan No",
      "Challan Date",
      "Material Name",
      "Quantity",
      "PO Number",
      "Invoice No",
      "GRN No",
      "GRN Date",
      "Mfg Date",
      "Exp Date",
      "Receiver Sign",
      "Remarks",
    ];
    const rows = records.map((r) => [
      r.srNo,
      r.date ? new Date(r.date).toLocaleDateString("en-IN") : "",
      r.supplierName,
      r.challanNo || "",
      r.challanDate ? new Date(r.challanDate).toLocaleDateString("en-IN") : "",
      r.materialName,
      r.quantity,
      r.poNumber,
      r.invoiceNo || "",
      r.grnNo || "",
      r.grnDate ? new Date(r.grnDate).toLocaleDateString("en-IN") : "",
      r.mfgDate ? new Date(r.mfgDate).toLocaleDateString("en-IN") : "",
      r.expDate ? new Date(r.expDate).toLocaleDateString("en-IN") : "",
      r.receiverSign || "",
      r.remarks || "",
    ]);
    return generateCsvString(headers, rows);
  } else {
    const { records } = await getDetailedGrnList(filter);
    const headers = [
      "GRN Number",
      "GRN Date",
      "PO Number",
      "Supplier Name",
      "Invoice No",
      "Vehicle No",
      "Material Name",
      "Material Code",
      "Batch Number",
      "Quantity Received",
      "No of Containers",
      "Material Condition",
      "Packing Condition",
      "Label Status",
      "Quantity Verified",
      "Sampled By",
      "QC Ref No",
      "Status Label Affixed",
      "Supervisor Sign",
    ];
    const rows = records.map((r) => [
      r.grnNumber,
      r.grnDate ? new Date(r.grnDate).toLocaleDateString("en-IN") : "",
      r.poNumber,
      r.supplierName,
      r.invoiceNo || "",
      r.vehicleNo || "",
      r.materialName,
      r.materialCode || "",
      r.batchNumber || "",
      r.quantityReceived || "",
      r.numberOfContainers || "",
      r.materialCondition,
      r.packingCondition,
      r.labelStatus,
      r.quantityVerified,
      r.sampledBy || "",
      r.qcReferenceNo || "",
      r.statusLabelAffixed,
      r.storeSupervisorSign || "",
    ]);
    return generateCsvString(headers, rows);
  }
}
