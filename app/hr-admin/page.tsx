import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { canRecordRegistry } from "@/server/services/hr-registry.service";
import { HrRegistryClient } from "./HrRegistryClient";

export const dynamic = "force-dynamic";

export default async function HrAdminPage() {
  const user = await getSession();

  // If user session exists but not authorized for HR/Gate registries
  if (user && !canRecordRegistry(user)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-slate-200">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-full mb-3">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800">Restricted Department Access</h2>
        <p className="text-xs text-slate-500 max-w-md mt-1">
          The HR Admin & Digital Gate Registries module is accessible by Security Gate Personnel, HR Administrators, and Super Administrators. Please switch personas above to test.
        </p>
      </div>
    );
  }

  // Fetch initial records across all 5 registers in parallel
  const [attendance, visitors, staff, inward, outward] = await Promise.all([
    prisma.attendanceRegister.findMany({
      orderBy: [{ date: "desc" }, { srNo: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: { recordedBy: { select: { fullName: true, employeeCode: true } } },
    }),
    prisma.visitorRegister.findMany({
      orderBy: [{ date: "desc" }, { srNo: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: { recordedBy: { select: { fullName: true, employeeCode: true } } },
    }),
    prisma.staffMovementRegister.findMany({
      orderBy: [{ date: "desc" }, { srNo: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: { recordedBy: { select: { fullName: true, employeeCode: true } } },
    }),
    prisma.materialInwardRegister.findMany({
      orderBy: [{ date: "desc" }, { srNo: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: { recordedBy: { select: { fullName: true, employeeCode: true } } },
    }),
    prisma.materialOutwardRegister.findMany({
      orderBy: [{ date: "desc" }, { srNo: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: { recordedBy: { select: { fullName: true, employeeCode: true } } },
    }),
  ]);

  return (
    <HrRegistryClient
      initialAttendance={JSON.parse(JSON.stringify(attendance))}
      initialVisitors={JSON.parse(JSON.stringify(visitors))}
      initialStaff={JSON.parse(JSON.stringify(staff))}
      initialInward={JSON.parse(JSON.stringify(inward))}
      initialOutward={JSON.parse(JSON.stringify(outward))}
      currentUser={{
        fullName: user?.fullName || "User",
        role: user?.roles[0] || "GATE_OPERATOR",
        department: user?.departmentName || "Gate Security",
      }}
    />
  );
}
