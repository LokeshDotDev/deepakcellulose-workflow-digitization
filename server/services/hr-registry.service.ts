import prisma from "@/lib/db";
import { SessionUser } from "@/lib/auth";
import { WorkerCategory, Prisma } from "@prisma/client";
import { logAuditEvent } from "./audit.service";

export function canRecordRegistry(user: SessionUser | null): boolean {
  if (!user) return false;
  if (user.roles.includes("SUPER_ADMIN") || user.roles.includes("ADMIN")) return true;
  if (user.roles.includes("HR_ADMIN") || user.roles.includes("HR_MANAGER")) return true;
  if (user.roles.includes("GATE_OPERATOR") || user.roles.includes("SECURITY_OFFICER")) return true;
  if (user.departmentCode === "HR" || user.departmentCode === "GATE" || user.departmentCode === "ADMIN") return true;
  return user.permissions.some(
    (p) => p.startsWith("HR_") || p.startsWith("GATE_") || p === "*"
  );
}

// ----------------------------------------------------
// 1. ATTENDANCE REGISTER
// ----------------------------------------------------

export interface AttendanceFilter {
  date?: string;
  category?: string;
  search?: string;
}

export async function getAttendanceList(filter: AttendanceFilter = {}) {
  const where: Prisma.AttendanceRegisterWhereInput = {};

  if (filter.category && filter.category !== "ALL") {
    where.category = filter.category as WorkerCategory;
  }

  if (filter.search && filter.search.trim()) {
    const s = filter.search.trim();
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { empCode: { contains: s, mode: "insensitive" } },
      { remarks: { contains: s, mode: "insensitive" } },
      { contractorName: { contains: s, mode: "insensitive" } },
    ];
  }

  if (filter.date) {
    const start = new Date(filter.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filter.date);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  const records = await prisma.attendanceRegister.findMany({
    where,
    orderBy: [{ date: "desc" }, { srNo: "asc" }, { createdAt: "desc" }],
    include: { recordedBy: { select: { fullName: true, employeeCode: true } } },
  });

  const total = records.length;
  const permanentCount = records.filter((r) => r.category === WorkerCategory.PERMANENT).length;
  const jalaramCount = records.filter((r) => r.category === WorkerCategory.CONTRACT_JALARAM).length;
  const yogitaCount = records.filter((r) => r.category === WorkerCategory.CONTRACT_YOGITA).length;
  const otherContractCount = records.filter((r) => r.category === WorkerCategory.CONTRACT_OTHER).length;
  const currentlyPresent = records.filter((r) => !r.outTime).length;
  const totalOtHours = records.reduce((sum, r) => sum + Number(r.otHours || 0), 0);

  return {
    records,
    summary: {
      total,
      permanentCount,
      jalaramCount,
      yogitaCount,
      otherContractCount,
      contractorTotal: jalaramCount + yogitaCount + otherContractCount,
      currentlyPresent,
      totalOtHours: Number(totalOtHours.toFixed(2)),
    },
  };
}

export async function createAttendanceEntry(
  data: {
    srNo?: number;
    date?: string | Date;
    empCode: string;
    name: string;
    category?: WorkerCategory;
    contractorName?: string;
    inTime: string;
    outTime?: string;
    otHours?: number;
    remarks?: string;
  },
  user: SessionUser
) {
  let srNo = data.srNo;
  if (!srNo) {
    const count = await prisma.attendanceRegister.count();
    srNo = count + 1;
  }

  let cat = data.category || WorkerCategory.PERMANENT;
  let contractor = data.contractorName;
  if (cat === WorkerCategory.CONTRACT_JALARAM && !contractor) contractor = "Jalaram";
  if (cat === WorkerCategory.CONTRACT_YOGITA && !contractor) contractor = "Yogita";

  const entry = await prisma.attendanceRegister.create({
    data: {
      srNo,
      date: data.date ? new Date(data.date) : new Date(),
      empCode: data.empCode.trim().toUpperCase(),
      name: data.name.trim(),
      category: cat,
      contractorName: contractor,
      inTime: data.inTime,
      outTime: data.outTime || null,
      otHours: data.otHours !== undefined ? Number(data.otHours) : 0,
      remarks: data.remarks || null,
      recordedById: user.id,
    },
  });

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    actorName: user.fullName,
    action: "CREATE_ATTENDANCE_RECORD",
    entityType: "ATTENDANCE_REGISTER",
    entityId: entry.id,
    details: { empCode: entry.empCode, name: entry.name, inTime: entry.inTime },
  });

  return entry;
}

// ----------------------------------------------------
// 2. VISITOR'S REGISTER
// ----------------------------------------------------

export interface VisitorFilter {
  date?: string;
  status?: string;
  search?: string;
}

export async function getVisitorList(filter: VisitorFilter = {}) {
  const where: Prisma.VisitorRegisterWhereInput = {};

  if (filter.status && filter.status !== "ALL") {
    where.status = filter.status;
  }

  if (filter.search && filter.search.trim()) {
    const s = filter.search.trim();
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { relatedPerson: { contains: s, mode: "insensitive" } },
      { mobileNo: { contains: s, mode: "insensitive" } },
      { company: { contains: s, mode: "insensitive" } },
      { badgeNo: { contains: s, mode: "insensitive" } },
      { vehicleNo: { contains: s, mode: "insensitive" } },
    ];
  }

  if (filter.date) {
    const start = new Date(filter.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filter.date);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  const records = await prisma.visitorRegister.findMany({
    where,
    orderBy: [{ date: "desc" }, { srNo: "asc" }, { createdAt: "desc" }],
    include: { recordedBy: { select: { fullName: true, employeeCode: true } } },
  });

  const total = records.length;
  const inPremises = records.filter((r) => r.status === "IN_PREMISES").length;
  const departed = records.filter((r) => r.status === "DEPARTED").length;

  return {
    records,
    summary: {
      total,
      inPremises,
      departed,
    },
  };
}

export async function createVisitorEntry(
  data: {
    srNo?: number;
    date?: string | Date;
    name: string;
    relatedPerson: string;
    inTime: string;
    outTime?: string;
    mobileNo: string;
    company?: string;
    purpose?: string;
    vehicleNo?: string;
    badgeNo?: string;
    signature?: string;
    remarks?: string;
  },
  user: SessionUser
) {
  let srNo = data.srNo;
  if (!srNo) {
    const count = await prisma.visitorRegister.count();
    srNo = count + 1;
  }

  const entry = await prisma.visitorRegister.create({
    data: {
      srNo,
      date: data.date ? new Date(data.date) : new Date(),
      name: data.name.trim(),
      relatedPerson: data.relatedPerson.trim(),
      inTime: data.inTime,
      outTime: data.outTime || null,
      mobileNo: data.mobileNo.trim(),
      company: data.company || null,
      purpose: data.purpose || null,
      vehicleNo: data.vehicleNo || null,
      badgeNo: data.badgeNo || `VIS-${100 + srNo}`,
      signature: data.signature || "VERIFIED_SECURITY",
      status: data.outTime ? "DEPARTED" : "IN_PREMISES",
      remarks: data.remarks || null,
      recordedById: user.id,
    },
  });

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    actorName: user.fullName,
    action: "CREATE_VISITOR_PASS",
    entityType: "VISITOR_REGISTER",
    entityId: entry.id,
    details: { name: entry.name, relatedPerson: entry.relatedPerson, badgeNo: entry.badgeNo },
  });

  return entry;
}

// ----------------------------------------------------
// 3. STAFF IN / OUT REGISTER
// ----------------------------------------------------

export interface StaffFilter {
  date?: string;
  status?: string;
  search?: string;
}

export async function getStaffMovementList(filter: StaffFilter = {}) {
  const where: Prisma.StaffMovementRegisterWhereInput = {};

  if (filter.status && filter.status !== "ALL") {
    where.status = filter.status;
  }

  if (filter.search && filter.search.trim()) {
    const s = filter.search.trim();
    where.OR = [
      { staffName: { contains: s, mode: "insensitive" } },
      { empCode: { contains: s, mode: "insensitive" } },
      { department: { contains: s, mode: "insensitive" } },
      { remarkReason: { contains: s, mode: "insensitive" } },
    ];
  }

  if (filter.date) {
    const start = new Date(filter.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filter.date);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  const records = await prisma.staffMovementRegister.findMany({
    where,
    orderBy: [{ date: "desc" }, { srNo: "asc" }, { createdAt: "desc" }],
    include: { recordedBy: { select: { fullName: true, employeeCode: true } } },
  });

  const total = records.length;
  const currentlyOut = records.filter((r) => r.status === "OUT").length;
  const returned = records.filter((r) => r.status === "RETURNED").length;

  return {
    records,
    summary: {
      total,
      currentlyOut,
      returned,
    },
  };
}

export async function createStaffMovementEntry(
  data: {
    srNo?: number;
    staffName: string;
    empCode?: string;
    department?: string;
    date?: string | Date;
    inTime?: string;
    outTime?: string;
    remarkReason: string;
    approvedBy?: string;
  },
  user: SessionUser
) {
  let srNo = data.srNo;
  if (!srNo) {
    const count = await prisma.staffMovementRegister.count();
    srNo = count + 1;
  }

  const isReturned = Boolean(data.inTime && data.outTime);
  const status = isReturned ? "RETURNED" : "OUT";

  const entry = await prisma.staffMovementRegister.create({
    data: {
      srNo,
      staffName: data.staffName.trim(),
      empCode: data.empCode || null,
      department: data.department || null,
      date: data.date ? new Date(data.date) : new Date(),
      inTime: data.inTime || null,
      outTime: data.outTime || null,
      remarkReason: data.remarkReason.trim(),
      approvedBy: data.approvedBy || null,
      status,
      recordedById: user.id,
    },
  });

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    actorName: user.fullName,
    action: "CREATE_STAFF_MOVEMENT",
    entityType: "STAFF_MOVEMENT_REGISTER",
    entityId: entry.id,
    details: { staffName: entry.staffName, reason: entry.remarkReason, status },
  });

  return entry;
}

// ----------------------------------------------------
// 4. GOODS AND MATERIAL INWARD DETAILS
// ----------------------------------------------------

export interface InwardFilter {
  date?: string;
  status?: string;
  search?: string;
}

export async function getMaterialInwardList(filter: InwardFilter = {}) {
  const where: Prisma.MaterialInwardRegisterWhereInput = {};

  if (filter.status && filter.status !== "ALL") {
    where.status = filter.status;
  }

  if (filter.search && filter.search.trim()) {
    const s = filter.search.trim();
    where.OR = [
      { partyName: { contains: s, mode: "insensitive" } },
      { invoiceChallanNo: { contains: s, mode: "insensitive" } },
      { materialName: { contains: s, mode: "insensitive" } },
      { vehicleNo: { contains: s, mode: "insensitive" } },
    ];
  }

  if (filter.date) {
    const start = new Date(filter.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filter.date);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  const records = await prisma.materialInwardRegister.findMany({
    where,
    orderBy: [{ date: "desc" }, { srNo: "asc" }, { createdAt: "desc" }],
    include: { recordedBy: { select: { fullName: true, employeeCode: true } } },
  });

  const total = records.length;
  const inPlant = records.filter((r) => r.status === "IN_PLANT").length;
  const unloaded = records.filter((r) => r.status === "UNLOADED" || r.status === "COMPLETED").length;
  const totalAmount = records.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return {
    records,
    summary: {
      total,
      inPlant,
      unloaded,
      totalAmount,
    },
  };
}

export async function createMaterialInwardEntry(
  data: {
    srNo?: number;
    date?: string | Date;
    partyName: string;
    invoiceChallanNo: string;
    invoiceDate?: string | Date;
    materialName: string;
    inTime: string;
    outTime?: string;
    amount?: number;
    vehicleNo: string;
    quantity?: string;
    remarks?: string;
  },
  user: SessionUser
) {
  let srNo = data.srNo;
  if (!srNo) {
    const count = await prisma.materialInwardRegister.count();
    srNo = count + 1;
  }

  const status = data.outTime ? "UNLOADED" : "IN_PLANT";

  const entry = await prisma.materialInwardRegister.create({
    data: {
      srNo,
      date: data.date ? new Date(data.date) : new Date(),
      partyName: data.partyName.trim(),
      invoiceChallanNo: data.invoiceChallanNo.trim(),
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
      materialName: data.materialName.trim(),
      inTime: data.inTime,
      outTime: data.outTime || null,
      amount: data.amount !== undefined ? Number(data.amount) : null,
      vehicleNo: data.vehicleNo.trim().toUpperCase(),
      quantity: data.quantity || null,
      status,
      remarks: data.remarks || null,
      recordedById: user.id,
    },
  });

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    actorName: user.fullName,
    action: "CREATE_MATERIAL_INWARD",
    entityType: "MATERIAL_INWARD_REGISTER",
    entityId: entry.id,
    details: { party: entry.partyName, vehicle: entry.vehicleNo, challan: entry.invoiceChallanNo },
  });

  return entry;
}

// ----------------------------------------------------
// 5. GOODS AND MATERIAL OUTWARD / DISPATCH DETAILS
// ----------------------------------------------------

export interface OutwardFilter {
  date?: string;
  status?: string;
  search?: string;
}

export async function getMaterialOutwardList(filter: OutwardFilter = {}) {
  const where: Prisma.MaterialOutwardRegisterWhereInput = {};

  if (filter.status && filter.status !== "ALL") {
    where.status = filter.status;
  }

  if (filter.search && filter.search.trim()) {
    const s = filter.search.trim();
    where.OR = [
      { partyName: { contains: s, mode: "insensitive" } },
      { invoiceNo: { contains: s, mode: "insensitive" } },
      { materialName: { contains: s, mode: "insensitive" } },
      { vehicleNo: { contains: s, mode: "insensitive" } },
      { transporter: { contains: s, mode: "insensitive" } },
    ];
  }

  if (filter.date) {
    const start = new Date(filter.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filter.date);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  const records = await prisma.materialOutwardRegister.findMany({
    where,
    orderBy: [{ date: "desc" }, { srNo: "asc" }, { createdAt: "desc" }],
    include: { recordedBy: { select: { fullName: true, employeeCode: true } } },
  });

  const total = records.length;
  const loading = records.filter((r) => r.status === "LOADING").length;
  const dispatched = records.filter((r) => r.status === "DISPATCHED" || r.status === "EXITED").length;
  const totalAmount = records.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return {
    records,
    summary: {
      total,
      loading,
      dispatched,
      totalAmount,
    },
  };
}

export async function createMaterialOutwardEntry(
  data: {
    srNo?: number;
    date?: string | Date;
    partyName: string;
    invoiceNo: string;
    invoiceDate?: string | Date;
    materialName: string;
    inTime: string;
    outTime?: string;
    amount?: number;
    vehicleNo: string;
    transporter?: string;
    quantity?: string;
    remarks?: string;
  },
  user: SessionUser
) {
  let srNo = data.srNo;
  if (!srNo) {
    const count = await prisma.materialOutwardRegister.count();
    srNo = count + 1;
  }

  const status = data.outTime ? "DISPATCHED" : "LOADING";

  const entry = await prisma.materialOutwardRegister.create({
    data: {
      srNo,
      date: data.date ? new Date(data.date) : new Date(),
      partyName: data.partyName.trim(),
      invoiceNo: data.invoiceNo.trim(),
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
      materialName: data.materialName.trim(),
      inTime: data.inTime,
      outTime: data.outTime || null,
      amount: data.amount !== undefined ? Number(data.amount) : null,
      vehicleNo: data.vehicleNo.trim().toUpperCase(),
      transporter: data.transporter || null,
      quantity: data.quantity || null,
      status,
      remarks: data.remarks || null,
      recordedById: user.id,
    },
  });

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    actorName: user.fullName,
    action: "CREATE_MATERIAL_OUTWARD",
    entityType: "MATERIAL_OUTWARD_REGISTER",
    entityId: entry.id,
    details: { party: entry.partyName, invoice: entry.invoiceNo, vehicle: entry.vehicleNo },
  });

  return entry;
}

// ----------------------------------------------------
// 6. CSV SERIALIZER HELPER (RFC-4180 COMPLIANT)
// ----------------------------------------------------

export function generateCsvString(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(",");
  const rowLines = rows.map((r) => r.map(escapeCell).join(","));
  return [headerLine, ...rowLines].join("\r\n");
}
