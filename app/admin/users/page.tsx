import React from "react";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Users, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AdminUsersClient } from "./AdminUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getSession();
  if (!user || (!user.roles.includes("SUPER_ADMIN") && !user.roles.includes("ADMIN"))) {
    redirect("/");
  }

  const [users, roles, departments] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        department: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Link
            href="/admin"
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Administration Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              User Access Governance, Onboarding Approvals & RBAC
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authorize new employee registrations, configure multiple assigned roles (e.g. Warehouse & QA), and grant granular permissions.
          </p>
        </div>
      </div>

      <AdminUsersClient
        initialUsers={JSON.parse(JSON.stringify(users))}
        roles={JSON.parse(JSON.stringify(roles))}
        departments={JSON.parse(JSON.stringify(departments))}
        currentUser={user}
      />
    </div>
  );
}
