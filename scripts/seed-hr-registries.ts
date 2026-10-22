import { PrismaClient, DepartmentCode, WorkerCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Provisioning HR Department, Role, User, and Digital Gate Registries...");

  // 1. Ensure HR Department
  let hrDept = await prisma.department.findUnique({
    where: { code: DepartmentCode.HR },
  });

  if (!hrDept) {
    hrDept = await prisma.department.create({
      data: {
        code: DepartmentCode.HR,
        name: "HR & Plant Administration",
        description: "Personnel registers, gate security logs, visitor control & contractor tracking",
      },
    });
    console.log("✓ HR Department created.");
  } else {
    console.log("✓ HR Department already exists.");
  }

  // 2. Ensure HR Role & Permissions
  let hrRole = await prisma.role.findUnique({
    where: { code: "HR_ADMIN" },
  });

  if (!hrRole) {
    hrRole = await prisma.role.create({
      data: {
        code: "HR_ADMIN",
        name: "HR & Compliance Administrator",
        description: "Personnel attendance, visitor registers, staff gate passes & contractor audits",
        isSystem: true,
      },
    });
    console.log("✓ HR_ADMIN role created.");
  }

  // Ensure HR permissions
  const hrActions = ["VIEW", "CREATE", "EDIT", "SUBMIT", "APPROVE", "EXPORT"];
  for (const act of hrActions) {
    const code = `HR_${act}`;
    let perm = await prisma.permission.findUnique({ where: { code } });
    if (!perm) {
      perm = await prisma.permission.create({
        data: {
          code,
          module: "HR",
          action: act,
          description: `Can ${act} within HR registry domain`,
        },
      });
    }

    const rp = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: hrRole.id,
          permissionId: perm.id,
        },
      },
    });
    if (!rp) {
      await prisma.rolePermission.create({
        data: {
          roleId: hrRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // 3. Ensure HR Demo User
  const passwordHash = await bcrypt.hash("demo123", 10);
  let hrUser = await prisma.user.findUnique({
    where: { email: "hr@deepakcellulose.com" },
  });

  if (!hrUser) {
    hrUser = await prisma.user.create({
      data: {
        email: "hr@deepakcellulose.com",
        fullName: "Kavita Shah",
        employeeCode: "DC-018",
        passwordHash,
        departmentId: hrDept.id,
      },
    });
    await prisma.userRole.create({
      data: {
        userId: hrUser.id,
        roleId: hrRole.id,
      },
    });
    console.log("✓ HR Demo User created (hr@deepakcellulose.com).");
  } else {
    console.log("✓ HR Demo User already exists.");
  }

  // Find Security Gate User for recording attribution
  const gateUser = await prisma.user.findUnique({
    where: { email: "gate@deepakcellulose.com" },
  });
  const securityRecorderId = gateUser?.id || hrUser.id;

  // 4. Seed Attendance Register if empty
  const attendanceCount = await prisma.attendanceRegister.count();
  if (attendanceCount === 0) {
    console.log("Seeding Attendance Register (Permanent & Contract - Jalaram / Yogita)...");
    const today = new Date();
    await prisma.attendanceRegister.createMany({
      data: [
        {
          srNo: 1,
          date: today,
          empCode: "DC-W01",
          name: "Ramesh Patel",
          category: WorkerCategory.PERMANENT,
          inTime: "08:00 AM",
          outTime: "05:00 PM",
          otHours: 0.0,
          remarks: "Regular Day Shift - Unit 1 Plant Floor",
          recordedById: securityRecorderId,
        },
        {
          srNo: 2,
          date: today,
          empCode: "JAL-102",
          name: "Suresh Solanki",
          category: WorkerCategory.CONTRACT_JALARAM,
          contractorName: "Jalaram",
          inTime: "08:30 AM",
          outTime: "06:30 PM",
          otHours: 2.0,
          remarks: "Reactor Cleaning & Vessel Wash Stage 2",
          recordedById: securityRecorderId,
        },
        {
          srNo: 3,
          date: today,
          empCode: "YOG-044",
          name: "Dinesh Rathod",
          category: WorkerCategory.CONTRACT_YOGITA,
          contractorName: "Yogita",
          inTime: "08:30 AM",
          outTime: "07:00 PM",
          otHours: 2.5,
          remarks: "Finished Goods Bagging & Palletizing",
          recordedById: securityRecorderId,
        },
        {
          srNo: 4,
          date: today,
          empCode: "DC-W05",
          name: "Bharat Dave",
          category: WorkerCategory.PERMANENT,
          inTime: "08:00 AM",
          outTime: null,
          otHours: 0.0,
          remarks: "Active in Shift - Boiler & Utilities",
          recordedById: securityRecorderId,
        },
        {
          srNo: 5,
          date: today,
          empCode: "JAL-108",
          name: "Mahesh Vaghela",
          category: WorkerCategory.CONTRACT_JALARAM,
          contractorName: "Jalaram",
          inTime: "08:45 AM",
          outTime: null,
          otHours: 1.0,
          remarks: "Etherification Line Maintenance helper",
          recordedById: securityRecorderId,
        },
      ],
    });
    console.log("✓ Attendance Register seeded.");
  }

  // 5. Seed Visitor Register if empty
  const visitorCount = await prisma.visitorRegister.count();
  if (visitorCount === 0) {
    console.log("Seeding Visitor Register...");
    const today = new Date();
    await prisma.visitorRegister.createMany({
      data: [
        {
          srNo: 1,
          date: today,
          name: "Pravin K. Parekh",
          relatedPerson: "Rajesh Mehta (Purchase)",
          inTime: "09:45 AM",
          outTime: "11:30 AM",
          mobileNo: "9825012345",
          company: "Gujarat Chemical Solvents Pvt Ltd",
          purpose: "Annual Solvent Contract Review",
          vehicleNo: "GJ-06-KL-7721",
          badgeNo: "VIS-101",
          signature: "VERIFIED_SECURITY",
          status: "DEPARTED",
          remarks: "Meeting concluded with Purchase Head",
          recordedById: securityRecorderId,
        },
        {
          srNo: 2,
          date: today,
          name: "Hitesh Joshi",
          relatedPerson: "Anil Sharma (Warehouse)",
          inTime: "11:15 AM",
          outTime: null,
          mobileNo: "9879154321",
          company: "Om Freight & Logistics Hub",
          purpose: "Warehouse pallet storage & stack auditing",
          vehicleNo: "GJ-01-MM-4490",
          badgeNo: "VIS-102",
          signature: "ACTIVE_PASS_ISSUED",
          status: "IN_PREMISES",
          remarks: "Accompanied by Warehouse Asst",
          recordedById: securityRecorderId,
        },
        {
          srNo: 3,
          date: today,
          name: "Dr. Alok Verma",
          relatedPerson: "Dr. Sunita Patel (QC)",
          inTime: "02:15 PM",
          outTime: null,
          mobileNo: "9904221188",
          company: "NABL Calibration Services",
          purpose: "HPLC Column Calibration Audit",
          vehicleNo: "GJ-06-ZZ-1200",
          badgeNo: "VIS-103",
          signature: "ID_VERIFIED",
          status: "IN_PREMISES",
          remarks: "Visiting Analytical QC Lab",
          recordedById: securityRecorderId,
        },
      ],
    });
    console.log("✓ Visitor Register seeded.");
  }

  // 6. Seed Staff In/Out Register if empty
  const staffCount = await prisma.staffMovementRegister.count();
  if (staffCount === 0) {
    console.log("Seeding Staff In / Out Register...");
    const today = new Date();
    await prisma.staffMovementRegister.createMany({
      data: [
        {
          srNo: 1,
          date: today,
          staffName: "Dr. Sunita Patel",
          empCode: "DC-045",
          department: "Quality Control & Assurance",
          inTime: "02:00 PM",
          outTime: "01:00 PM",
          remarkReason: "Official: Sample submission at GIDC Analytical Test Lab",
          approvedBy: "Priya Shah (Super Admin)",
          status: "RETURNED",
          recordedById: securityRecorderId,
        },
        {
          srNo: 2,
          date: today,
          staffName: "Manoj Joshi",
          empCode: "DC-052",
          department: "Manufacturing & Production",
          inTime: null,
          outTime: "02:30 PM",
          remarkReason: "Official: Emergency mechanical seal replacement from Nandesari GIDC",
          approvedBy: "Plant Operations Head",
          status: "OUT",
          recordedById: securityRecorderId,
        },
        {
          srNo: 3,
          date: today,
          staffName: "Rajesh Mehta",
          empCode: "DC-012",
          department: "Procurement & Sourcing",
          inTime: "12:45 PM",
          outTime: "11:30 AM",
          remarkReason: "Bank documentation & LC clearance for raw material import",
          approvedBy: "Finance Head",
          status: "RETURNED",
          recordedById: securityRecorderId,
        },
      ],
    });
    console.log("✓ Staff In / Out Register seeded.");
  }

  // 7. Seed Goods & Material Inward Register if empty
  const inwardCount = await prisma.materialInwardRegister.count();
  if (inwardCount === 0) {
    console.log("Seeding Goods & Material Inward Register...");
    const today = new Date();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.materialInwardRegister.createMany({
      data: [
        {
          srNo: 1,
          date: today,
          partyName: "Reliance Industries Ltd",
          invoiceChallanNo: "RIL/CH-8821",
          invoiceDate: twoDaysAgo,
          materialName: "Monochloroacetic Acid (MCA) 99.5% Pure",
          inTime: "08:15 AM",
          outTime: "10:30 AM",
          amount: 385000.0,
          vehicleNo: "GJ-06-AX-4821",
          quantity: "10 MT (Bulk Road Tanker)",
          status: "UNLOADED",
          remarks: "Weighment verified. QC composite sample drawn.",
          recordedById: securityRecorderId,
        },
        {
          srNo: 2,
          date: today,
          partyName: "Century Rayon Pulp Mills Ltd",
          invoiceChallanNo: "CRP/INV-4029",
          invoiceDate: yesterday,
          materialName: "High Alpha Cellulose Wood Pulp Sheets",
          inTime: "10:00 AM",
          outTime: null,
          amount: 540000.0,
          vehicleNo: "MH-04-DE-1920",
          quantity: "15 MT (600 Wrapped Rolls)",
          status: "IN_PLANT",
          remarks: "Vehicle stationed at RM Bay 2 for forklift unloading",
          recordedById: securityRecorderId,
        },
        {
          srNo: 3,
          date: today,
          partyName: "Gujarat Alkalies & Chemicals Ltd (GACL)",
          invoiceChallanNo: "GACL/CH-9912",
          invoiceDate: today,
          materialName: "Caustic Soda Lye (NaOH) 48% Grade",
          inTime: "12:30 PM",
          outTime: null,
          amount: 295000.0,
          vehicleNo: "GJ-16-AU-5501",
          quantity: "12 MT (Storage Tank Transfer)",
          status: "IN_PLANT",
          remarks: "Pressure safety valves checked by safety officer",
          recordedById: securityRecorderId,
        },
      ],
    });
    console.log("✓ Goods & Material Inward Register seeded.");
  }

  // 8. Seed Goods & Material Outward Register if empty
  const outwardCount = await prisma.materialOutwardRegister.count();
  if (outwardCount === 0) {
    console.log("Seeding Goods & Material Outward/Dispatch Register...");
    const today = new Date();
    await prisma.materialOutwardRegister.createMany({
      data: [
        {
          srNo: 1,
          date: today,
          partyName: "Sun Pharma Healthcare Ltd (Vadodara)",
          invoiceNo: "INV-2026-0034",
          invoiceDate: today,
          materialName: "HPMC-P Pharmaceutical Grade 2208 (Lot #HPMC-26-001)",
          inTime: "09:00 AM",
          outTime: "11:45 AM",
          amount: 875000.0,
          vehicleNo: "GJ-01-TX-9988",
          transporter: "V-Trans India Ltd",
          quantity: "2500 KG (50 Fiber Drums)",
          status: "DISPATCHED",
          remarks: "COA and Dispatch Challan handed to driver. Tamper seals verified.",
          recordedById: securityRecorderId,
        },
        {
          srNo: 2,
          date: today,
          partyName: "Cipla Ltd (Patalganga Unit IV)",
          invoiceNo: "INV-2026-0035",
          invoiceDate: today,
          materialName: "Purified Cellulose Derivatives (Lot #CD-26-003)",
          inTime: "12:15 PM",
          outTime: null,
          amount: 620000.0,
          vehicleNo: "GJ-05-BZ-3311",
          transporter: "SafeXpress Roadways Ltd",
          quantity: "1800 KG (36 Palletized Drums)",
          status: "LOADING",
          remarks: "Loading in progress at Finished Goods Bay 1",
          recordedById: securityRecorderId,
        },
        {
          srNo: 3,
          date: today,
          partyName: "Zydus Lifesciences (Moraiya Formulation Unit)",
          invoiceNo: "INV-2026-0036",
          invoiceDate: today,
          materialName: "Microcrystalline Cellulose Powder NF-Grade",
          inTime: "01:30 PM",
          outTime: null,
          amount: 450000.0,
          vehicleNo: "GJ-06-WW-2219",
          transporter: "ARC Road Logistics",
          quantity: "1200 KG (48 Bags)",
          status: "LOADING",
          remarks: "Driver verified, dock assigned",
          recordedById: securityRecorderId,
        },
      ],
    });
    console.log("✓ Goods & Material Outward/Dispatch Register seeded.");
  }

  console.log("🎉 HR & Digital Gate Registries successfully provisioned!");
}

main()
  .catch((e) => {
    console.error("Failed to seed HR registries:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
