import React from "react";
import prisma from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Shield,
  Sliders,
  GitBranch,
  Database,
  Building2,
  Boxes,
  Truck,
  CheckCircle2,
  Plus,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [users, roles, departments, materials, products, warehouses, equipment, suppliers, customers, uoms] =
    await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          department: true,
          userRoles: { include: { role: true } },
        },
      }),
      prisma.role.findMany({
        include: {
          permissions: { include: { permission: true } },
          userRoles: true,
        },
      }),
      prisma.department.findMany({ include: { users: true } }),
      prisma.material.findMany({ include: { baseUnit: true } }),
      prisma.product.findMany({ include: { baseUnit: true } }),
      prisma.warehouse.findMany({ include: { locations: true } }),
      prisma.equipment.findMany(),
      prisma.supplier.findMany(),
      prisma.customer.findMany(),
      prisma.unitOfMeasure.findMany(),
    ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">System Administration & Master Governance</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise RBAC, department memberships, master catalogs, dynamic engines & system security.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/forms"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            Dynamic Form Builder
          </Link>
          <Link
            href="/admin/workflows"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
          >
            <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
            Workflow Engine
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Active Users</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{users.length} Operators</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across {departments.length} departments</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Security Roles</div>
          <div className="text-xl font-bold text-purple-700 mt-1">{roles.length} Configured</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Granular action permissions</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Master Catalog Items</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{materials.length + products.length} Materials</div>
          <div className="text-[11px] text-slate-400 mt-0.5">RM, packaging & finished excipients</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Plant Infrastructure</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{warehouses.length} Warehouses</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{equipment.length} Reaction & drying assets</div>
        </div>
      </div>

      {/* Users & RBAC Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">User Access Control & Department Assignments</h2>
            <p className="text-xs text-slate-500">Separation of user identity, department authorization & RBAC roles</p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            RBAC Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Assigned Roles</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{u.fullName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.employeeCode || "N/A"}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {u.email}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800">
                      {u.department?.name || "System Admin"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {u.userRoles.map((ur) => (
                        <span key={ur.id} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          {ur.role.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={u.isActive ? "success" : "danger"}>
                      {u.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {formatDate(u.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Master Data Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Raw Materials Master */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-600" />
              Raw Materials Master
            </h3>
            <span className="text-xs text-slate-400">{materials.length} items</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {materials.map((m) => (
              <div key={m.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{m.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {m.code} • Base Unit: {m.baseUnit.code} • Reorder: {Number(m.reorderPoint)} {m.baseUnit.code}
                  </div>
                </div>
                <Badge variant={m.qcRequired ? "warning" : "default"}>
                  {m.qcRequired ? "QC Mandatory" : "Direct Release"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Finished Products Master */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Finished Products Master
            </h3>
            <span className="text-xs text-slate-400">{products.length} products</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {products.map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{p.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {p.code} • {p.grade || "Pharma IP/BP/USP"} • Std Batch: {Number(p.standardBatchSize)} {p.baseUnit.code}
                  </div>
                </div>
                <Badge variant="success">Active Catalog</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
