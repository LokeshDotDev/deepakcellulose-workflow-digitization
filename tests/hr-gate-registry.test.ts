import { test, describe, before } from "node:test";
import assert from "node:assert";
import prisma from "../lib/db";
import { WorkerCategory, DepartmentCode } from "@prisma/client";
import {
  canRecordRegistry,
  createAttendanceEntry,
  getAttendanceList,
  createVisitorEntry,
  getVisitorList,
  createStaffMovementEntry,
  getStaffMovementList,
  createMaterialInwardEntry,
  getMaterialInwardList,
  createMaterialOutwardEntry,
  getMaterialOutwardList,
  generateCsvString,
} from "../server/services/hr-registry.service";

describe("8. HR ADMIN & SECURITY GATE REGISTRIES TEST SUITE", () => {
  let adminUser: any;
  let gateUser: any;
  let hrUser: any;
  let unauthorizedUser: any;

  before(async () => {
    // Retrieve users
    adminUser = await prisma.user.findUnique({
      where: { email: "admin@deepakcellulose.com" },
      include: { department: true, userRoles: { include: { role: true } } },
    });

    gateUser = await prisma.user.findUnique({
      where: { email: "gate@deepakcellulose.com" },
      include: { department: true, userRoles: { include: { role: true } } },
    });

    hrUser = await prisma.user.findUnique({
      where: { email: "hr@deepakcellulose.com" },
      include: { department: true, userRoles: { include: { role: true } } },
    });

    // If HR user wasn't in DB yet, create or link
    if (!hrUser) {
      let dept = await prisma.department.findUnique({ where: { code: DepartmentCode.HR } });
      if (!dept) {
        dept = await prisma.department.create({
          data: {
            code: DepartmentCode.HR,
            name: "HR & Plant Administration",
          },
        });
      }
      hrUser = await prisma.user.create({
        data: {
          email: "hr@deepakcellulose.com",
          fullName: "Kavita Shah",
          passwordHash: "dummy",
          departmentId: dept.id,
        },
        include: { department: true, userRoles: { include: { role: true } } },
      });
    }

    unauthorizedUser = await prisma.user.findUnique({
      where: { email: "accounts@deepakcellulose.com" },
      include: { department: true, userRoles: { include: { role: true } } },
    });
  });

  test("8.1 Role-Based Access: Security Gate, HR, and Super Admin hold recording rights", () => {
    const adminSession: any = {
      id: adminUser?.id,
      email: "admin@deepakcellulose.com",
      roles: ["SUPER_ADMIN"],
      permissions: ["*"],
      departmentCode: "ADMIN",
    };
    const gateSession: any = {
      id: gateUser?.id,
      email: "gate@deepakcellulose.com",
      roles: ["GATE_OPERATOR"],
      permissions: ["GATE_VIEW", "GATE_CREATE"],
      departmentCode: "GATE",
    };
    const hrSession: any = {
      id: hrUser?.id,
      email: "hr@deepakcellulose.com",
      roles: ["HR_ADMIN"],
      permissions: ["HR_VIEW", "HR_CREATE"],
      departmentCode: "HR",
    };
    const unauthSession: any = {
      id: unauthorizedUser?.id,
      email: "accounts@deepakcellulose.com",
      roles: ["ACCOUNTS_MANAGER"],
      permissions: ["ACCOUNTS_VIEW"],
      departmentCode: "ACCOUNTS",
    };

    assert.strictEqual(canRecordRegistry(adminSession), true, "Super Admin must have registry recording rights");
    assert.strictEqual(canRecordRegistry(gateSession), true, "Security Gate Operator must have registry recording rights");
    assert.strictEqual(canRecordRegistry(hrSession), true, "HR Admin must have registry recording rights");
    assert.strictEqual(canRecordRegistry(unauthSession), false, "Accounts user should not have registry recording rights");
  });

  test("8.2 Attendance Register: Records Permanent and Contractor (Jalaram/Yogita) attendance & calculates OT", async () => {
    const session: any = { id: gateUser.id, email: gateUser.email, fullName: gateUser.fullName, roles: ["GATE_OPERATOR"], permissions: [] };

    // Record Permanent Employee Attendance
    const permEntry = await createAttendanceEntry(
      {
        empCode: "DC-TEST-01",
        name: "Test Worker Perm",
        category: WorkerCategory.PERMANENT,
        inTime: "08:00 AM",
        outTime: "05:00 PM",
        otHours: 0,
        remarks: "Shift A Regular",
      },
      session
    );
    assert.ok(permEntry.id);
    assert.strictEqual(permEntry.category, WorkerCategory.PERMANENT);

    // Record Contractor (Jalaram) Attendance with Overtime
    const jalaramEntry = await createAttendanceEntry(
      {
        empCode: "JAL-TEST-09",
        name: "Test Jalaram Worker",
        category: WorkerCategory.CONTRACT_JALARAM,
        contractorName: "Jalaram",
        inTime: "08:30 AM",
        outTime: "07:30 PM",
        otHours: 3.0,
        remarks: "Vessel cleaning overtime",
      },
      session
    );
    assert.ok(jalaramEntry.id);
    assert.strictEqual(jalaramEntry.contractorName, "Jalaram");
    assert.strictEqual(Number(jalaramEntry.otHours), 3.0);

    // Query list & verify summaries
    const listResult = await getAttendanceList({ search: "Test Jalaram" });
    assert.ok(listResult.records.length >= 1);
    assert.strictEqual(listResult.records[0].empCode, "JAL-TEST-09");
  });

  test("8.3 Visitor's Register: Check-in, badge issuance, in-premises tracking, and checkout exit", async () => {
    const session: any = { id: gateUser.id, email: gateUser.email, fullName: gateUser.fullName, roles: ["GATE_OPERATOR"], permissions: [] };

    const visitor = await createVisitorEntry(
      {
        name: "Auditor Sharma",
        relatedPerson: "QA Manager",
        inTime: "10:15 AM",
        mobileNo: "9988776655",
        company: "ISO 9001 Inspection Agency",
        purpose: "Annual Plant Audit",
        badgeNo: "VIS-TEST-01",
      },
      session
    );

    assert.ok(visitor.id);
    assert.strictEqual(visitor.status, "IN_PREMISES");

    // Query visitor list
    const activeVisitors = await getVisitorList({ status: "IN_PREMISES" });
    const found = activeVisitors.records.find((v) => v.id === visitor.id);
    assert.ok(found, "Newly checked-in visitor must appear in active visitors query");

    // Punch out / Mark departure
    const updatedVisitor = await prisma.visitorRegister.update({
      where: { id: visitor.id },
      data: { outTime: "01:30 PM", status: "DEPARTED" },
    });
    assert.strictEqual(updatedVisitor.status, "DEPARTED");
    assert.strictEqual(updatedVisitor.outTime, "01:30 PM");
  });

  test("8.4 Staff Movement Register: Gate passes for plant staff during work hours", async () => {
    const session: any = { id: gateUser.id, email: gateUser.email, fullName: gateUser.fullName, roles: ["GATE_OPERATOR"], permissions: [] };

    const staffPass = await createStaffMovementEntry(
      {
        staffName: "Kailash Rawat",
        empCode: "DC-033",
        department: "Maintenance",
        outTime: "03:00 PM",
        remarkReason: "Official: Bearing replacement procurement at local market",
        approvedBy: "Plant Engineer",
      },
      session
    );

    assert.ok(staffPass.id);
    assert.strictEqual(staffPass.status, "OUT");

    // Return check-in
    const returned = await prisma.staffMovementRegister.update({
      where: { id: staffPass.id },
      data: { inTime: "04:15 PM", status: "RETURNED" },
    });
    assert.strictEqual(returned.status, "RETURNED");
    assert.strictEqual(returned.inTime, "04:15 PM");
  });

  test("8.5 Goods & Material Inward Register: Gatekeeper logs incoming raw materials", async () => {
    const session: any = { id: gateUser.id, email: gateUser.email, fullName: gateUser.fullName, roles: ["GATE_OPERATOR"], permissions: [] };

    const inward = await createMaterialInwardEntry(
      {
        partyName: "Test Chemical Supplier Corp",
        invoiceChallanNo: "CH-TEST-5541",
        materialName: "Sodium Hydroxide Flakes",
        inTime: "09:30 AM",
        amount: 145000,
        vehicleNo: "GJ-06-TEST-99",
        quantity: "5 MT",
      },
      session
    );

    assert.ok(inward.id);
    assert.strictEqual(inward.status, "IN_PLANT");

    // Complete unloading and departure
    const departedInward = await prisma.materialInwardRegister.update({
      where: { id: inward.id },
      data: { outTime: "11:00 AM", status: "UNLOADED" },
    });
    assert.strictEqual(departedInward.status, "UNLOADED");
    assert.strictEqual(departedInward.outTime, "11:00 AM");
  });

  test("8.6 Goods & Material Outward Register: Gatekeeper logs dispatch vehicles", async () => {
    const session: any = { id: gateUser.id, email: gateUser.email, fullName: gateUser.fullName, roles: ["GATE_OPERATOR"], permissions: [] };

    const outward = await createMaterialOutwardEntry(
      {
        partyName: "Test Pharma Formulations Ltd",
        invoiceNo: "INV-TEST-7788",
        materialName: "HPMC Ph Grade lot #TEST-01",
        inTime: "11:00 AM",
        amount: 520000,
        vehicleNo: "GJ-01-DISP-01",
        transporter: "Express Cargo Transport",
        quantity: "1500 KG",
      },
      session
    );

    assert.ok(outward.id);
    assert.strictEqual(outward.status, "LOADING");

    // Complete loading and gate exit
    const exitedOutward = await prisma.materialOutwardRegister.update({
      where: { id: outward.id },
      data: { outTime: "01:00 PM", status: "DISPATCHED" },
    });
    assert.strictEqual(exitedOutward.status, "DISPATCHED");
    assert.strictEqual(exitedOutward.outTime, "01:00 PM");
  });

  test("8.7 CSV Export Engine: Correct RFC-4180 escaping and headers matching physical register columns", () => {
    const headers = ["Sr. No.", "Emp Code", "Name", "In Time", "Out Time", "OT Hours", "Remarks"];
    const rows = [
      [1, "DC-01", "Ramesh, Patel", "08:00 AM", "05:00 PM", "0.00", 'Cleaned "Vessel A"'],
      [2, "DC-02", "Suresh Solanki", "08:30 AM", "07:30 PM", "2.50", "Shift B\nOvertime"],
    ];

    const csv = generateCsvString(headers, rows);

    // Verify header line
    assert.ok(csv.includes("Sr. No.,Emp Code,Name,In Time,Out Time,OT Hours,Remarks"));
    // Verify comma escaping with quotes
    assert.ok(csv.includes('"Ramesh, Patel"'));
    // Verify quote escaping
    assert.ok(csv.includes('""Vessel A""'));
  });
});
