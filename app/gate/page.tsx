import React from "react";
import Link from "next/link";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatQuantity, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Truck,
  Scale,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  ClipboardCheck,
} from "lucide-react";
import { GateActions } from "./GateActions";
import { WarehouseSopRegisters } from "@/components/warehouse/WarehouseSopRegisters";
import {
  getIncomingChecklists,
  getRmInwardRegisterList,
  getDetailedGrnList,
} from "@/server/services/warehouse-sop.service";

export const dynamic = "force-dynamic";

export default async function SecurityGatePage() {
  const [
    user,
    gateEntries,
    suppliers,
    purchaseOrders,
    checklists,
    rmInward,
    grns,
  ] = await Promise.all([
    getSession(),
    prisma.gateEntry.findMany({
      orderBy: { arrivalTime: "desc" },
      include: {
        supplier: true,
        purchaseOrder: true,
        goodsReceipt: true,
      },
    }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.purchaseOrder.findMany({
      where: { status: { in: ["APPROVED", "PARTIALLY_RECEIVED"] } },
      include: { supplier: true },
    }),
    getIncomingChecklists(),
    getRmInwardRegisterList(),
    getDetailedGrnList(),
  ]);

  const inYard = gateEntries.filter((g: any) => g.status === "RECORDED" || g.status === "SENT_TO_WAREHOUSE").length;
  const processedToday = gateEntries.filter((g: any) => g.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Security Gate & Logistics Entry</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Plant physical gate control, inbound vehicle tare/gross weighment, driver verification & security passes.
          </p>
        </div>

        <GateActions
          suppliers={JSON.parse(JSON.stringify(suppliers))}
          purchaseOrders={JSON.parse(JSON.stringify(purchaseOrders))}
        />
      </div>

      {/* HR Digital Gate Registers Access Banner for Security Gate Person */}
      <div className="bg-linear-to-r from-fuchsia-950 via-purple-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs border border-fuchsia-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-400/20 text-fuchsia-200 border border-fuchsia-400/30">
                HR ADMIN & COMPLIANCE REGISTRIES
              </span>
              <span className="text-xs text-fuchsia-200/80">• Security Gate Logbooks</span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Digitized Plant & Security Gate Registers
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              All 5 physical gate registers (Permanent & Contract Attendance, Visitor Pass, Staff In/Out, Goods Inward, Goods Outward) are digitized in the HR Admin section. Recorded and maintained directly by Security Gate, HR, or Super Admin.
            </p>
          </div>

          <Link
            href="/hr-admin"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 transition shadow-sm cursor-pointer whitespace-nowrap self-start md:self-auto"
          >
            <FileSpreadsheet className="w-4 h-4 text-fuchsia-600" />
            Open Full HR Gate Registers
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-4 pt-3.5 border-t border-white/10">
          <Link
            href="/hr-admin"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-left cursor-pointer group"
          >
            <div className="text-[10px] text-fuchsia-200 font-semibold uppercase flex items-center justify-between">
              Attendance
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="text-xs font-medium text-white mt-0.5">Permanent & Contract</div>
          </Link>
          <Link
            href="/hr-admin"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-left cursor-pointer group"
          >
            <div className="text-[10px] text-amber-200 font-semibold uppercase flex items-center justify-between">
              Visitors
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="text-xs font-medium text-white mt-0.5">Pass & ID Check-in</div>
          </Link>
          <Link
            href="/hr-admin"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-left cursor-pointer group"
          >
            <div className="text-[10px] text-rose-200 font-semibold uppercase flex items-center justify-between">
              Staff Movements
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="text-xs font-medium text-white mt-0.5">In / Out Passes</div>
          </Link>
          <Link
            href="/hr-admin"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-left cursor-pointer group"
          >
            <div className="text-[10px] text-emerald-200 font-semibold uppercase flex items-center justify-between">
              Goods Inward
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="text-xs font-medium text-white mt-0.5">Supplier Materials</div>
          </Link>
          <Link
            href="/hr-admin"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-left cursor-pointer group col-span-2 sm:col-span-1"
          >
            <div className="text-[10px] text-cyan-200 font-semibold uppercase flex items-center justify-between">
              Goods Outward
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="text-xs font-medium text-white mt-0.5">Dispatches & Challans</div>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Vehicles In Factory Yard</div>
          <div className="text-xl font-bold text-amber-600 mt-1">{inYard} Vehicles</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting or undergoing warehouse unloading</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Completed Unloadings</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{processedToday} Deliveries</div>
          <div className="text-[11px] text-slate-400 mt-0.5">GRN generated by stores</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Logged Gate Entries</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{gateEntries.length} Gate Passes</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Electronic weighbridge register</div>
        </div>
      </div>

      {/* Gate Pass Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Security Inbound Register</h2>
          <span className="text-xs text-slate-500 font-medium">Automatic Tare-Gross Net Calculation</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Gate Pass</th>
                <th className="py-3 px-4">Vehicle & Driver</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Challan / PO Ref</th>
                <th className="py-3 px-4">Weighbridge (Gross / Tare / Net)</th>
                <th className="py-3 px-4">Arrival Time</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {gateEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No gate entries recorded yet.
                  </td>
                </tr>
              ) : (
                gateEntries.map((ge: any) => (
                  <tr key={ge.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {ge.gatePassNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{ge.vehicleNumber}</div>
                      <div className="text-[11px] text-slate-500">{ge.driverName} {ge.driverPhone ? `(${ge.driverPhone})` : ""}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{ge.supplier.name}</div>
                      <div className="text-[11px] text-slate-400">{ge.declaredMaterials || "Raw Materials"}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-800">Challan: {ge.challanNumber}</div>
                      <div className="text-[11px] text-slate-500">
                        {ge.purchaseOrder ? `PO: ${ge.purchaseOrder.poNumber}` : "No PO linked"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {ge.weighbridgeNetWeight ? (
                        <div className="text-[11px] space-y-0.5">
                          <span className="font-bold text-emerald-700">{formatQuantity(ge.weighbridgeNetWeight, "KG")} Net</span>
                          <div className="text-[10px] text-slate-400">
                            G: {Number(ge.weighbridgeGrossWeight)} | T: {Number(ge.weighbridgeTareWeight)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Manual Check ({Number(ge.declaredQuantity || 0)} KG)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDate(ge.arrivalTime, true)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={ge.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dual Entry: Warehouse Inward SOP Registers (Checklist, RM Inward, GRN) Accessible by Security Gate */}
      <div className="space-y-3 pt-2">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Warehouse Inward & Detailed GRN Registers (Dual Gate & Warehouse Entry)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Physical register forms (Incoming RM Checklist, RM Inward Register, and Goods Received Note) can be directly recorded by Security Gate personnel upon vehicle arrival or by Warehouse stores.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-white border border-emerald-300 px-3 py-1 rounded-full whitespace-nowrap self-start sm:self-auto">
            Authorized Gate Operator Entry
          </span>
        </div>

        <WarehouseSopRegisters
          initialChecklists={JSON.parse(JSON.stringify(checklists?.records || []))}
          initialRmInward={JSON.parse(JSON.stringify(rmInward?.records || []))}
          initialGrns={JSON.parse(JSON.stringify(grns?.records || []))}
          currentUser={
            user
              ? {
                  fullName: user.fullName,
                  role: user.roles[0] || "Gate Operator",
                  department: user.departmentName || "Security Gate",
                }
              : undefined
          }
          defaultTab="checklist"
        />
      </div>
    </div>
  );
}
