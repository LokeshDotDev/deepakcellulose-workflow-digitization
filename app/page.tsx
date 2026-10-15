import React from "react";
import Link from "next/link";
import prisma from "@/lib/db";
import { formatCurrency, formatQuantity, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Factory,
  ShoppingCart,
  Shield,
  Warehouse,
  CheckCircle,
  Cog,
  Boxes,
  Truck,
  Receipt,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileCheck2,
  GitBranch,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Aggregate real operational metrics from PostgreSQL
  const [
    openPOs,
    gateEntriesToday,
    lotsPendingQC,
    activeBatches,
    availableFGLots,
    pendingDispatches,
    supplierInvoices,
    recentAudits,
    materialsList,
    productsList,
  ] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { status: { in: ["APPROVED", "PARTIALLY_RECEIVED", "SUBMITTED"] } },
      include: { supplier: true },
    }),
    prisma.gateEntry.findMany({
      where: { status: { not: "COMPLETED" } },
      include: { supplier: true },
    }),
    prisma.inventoryLot.findMany({
      where: { status: "RECEIVED_PENDING_QC" },
      include: { material: true },
    }),
    prisma.batch.findMany({
      where: { status: "IN_PROGRESS" },
      include: { productionOrder: { include: { product: true } } },
    }),
    prisma.finishedGoodsLot.findMany({
      where: { status: { in: ["AVAILABLE", "QC_APPROVED"] } },
      include: { product: true },
    }),
    prisma.customerOrder.findMany({
      where: { status: { in: ["CONFIRMED", "PROCESSING", "PARTIALLY_DISPATCHED"] } },
      include: { customer: true },
    }),
    prisma.supplierInvoice.findMany({
      where: { threeWayMatchStatus: "MATCHED" },
    }),
    prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 6,
    }),
    prisma.material.findMany({ where: { isActive: true } }),
    prisma.product.findMany({ where: { isActive: true } }),
  ]);

  const totalPOValue = openPOs.reduce((acc, po) => acc + Number(po.totalAmount), 0);
  const totalFGStockKG = availableFGLots.reduce((acc, lot) => acc + Number(lot.currentQuantity), 0);
  const totalQuarantineLotsCount = lotsPendingQC.length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Manufacturing Operations Command Center
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
              Vadodara Plant 1
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time material lifecycle monitoring, batch synthesis, quality release gates & dispatch logistics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/traceability"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
          >
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            Batch Traceability
          </Link>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
          >
            Operational Reports
          </Link>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Inbound POs</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{openPOs.length} Orders</div>
            <div className="text-xs text-slate-500 mt-0.5">Committed: {formatCurrency(totalPOValue)}</div>
          </div>
          <Link href="/procurement" className="mt-4 flex items-center text-xs font-medium text-blue-600 hover:text-blue-700 gap-1">
            View procurement pipeline <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">QC Quarantine Hold</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600">{totalQuarantineLotsCount} Lots</div>
            <div className="text-xs text-slate-500 mt-0.5">Awaiting assay test & release</div>
          </div>
          <Link href="/qc" className="mt-4 flex items-center text-xs font-medium text-amber-600 hover:text-amber-700 gap-1">
            Inspect in QC portal <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active BMR Batches</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Cog className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-600">{activeBatches.length} Batches</div>
            <div className="text-xs text-slate-500 mt-0.5">MCC & CMC synthesis in progress</div>
          </div>
          <Link href="/production" className="mt-4 flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-700 gap-1">
            Open production control <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available FG Inventory</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700">{formatQuantity(totalFGStockKG, "KG")}</div>
            <div className="text-xs text-slate-500 mt-0.5">{availableFGLots.length} released lot lots</div>
          </div>
          <Link href="/finished-goods" className="mt-4 flex items-center text-xs font-medium text-emerald-600 hover:text-emerald-700 gap-1">
            Finished Goods warehouse <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Visual End-to-End Material-to-Dispatch Flow */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Factory className="w-4 h-4 text-emerald-600" />
              INTEGRATED MATERIAL-TO-DISPATCH PIPELINE
            </h2>
            <p className="text-xs text-slate-500">
              Live status across all 8 operational gates for Deepak Cellulose Pvt. Ltd.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">Strict Quality & Audit Enforced</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
          <Link href="/procurement" className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 transition group">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 mx-auto flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition">
              1
            </div>
            <div className="text-xs font-semibold text-slate-900">Purchase</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{openPOs.length} Active POs</div>
          </Link>

          <Link href="/gate" className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50/50 border border-slate-200/80 transition group">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 mx-auto flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition">
              2
            </div>
            <div className="text-xs font-semibold text-slate-900">Gate Entry</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{gateEntriesToday.length} In Yard</div>
          </Link>

          <Link href="/warehouse" className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 transition group">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition">
              3
            </div>
            <div className="text-xs font-semibold text-slate-900">Warehouse</div>
            <div className="text-[10px] text-slate-500 mt-0.5">GRN & Bins</div>
          </Link>

          <Link href="/qc" className="p-3 rounded-xl bg-slate-50 hover:bg-rose-50/50 border border-slate-200/80 transition group">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 mx-auto flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition">
              4
            </div>
            <div className="text-xs font-semibold text-slate-900">QC/QA</div>
            <div className="text-[10px] text-rose-600 font-medium mt-0.5">{lotsPendingQC.length} Pending</div>
          </Link>

          <Link href="/production" className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 transition group">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 mx-auto flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition">
              5
            </div>
            <div className="text-xs font-semibold text-slate-900">Production</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{activeBatches.length} BMR Batches</div>
          </Link>

          <Link href="/finished-goods" className="p-3 rounded-xl bg-slate-50 hover:bg-teal-50/50 border border-slate-200/80 transition group">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 mx-auto flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition">
              6
            </div>
            <div className="text-xs font-semibold text-slate-900">FG Store</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{availableFGLots.length} Released Lots</div>
          </Link>

          <Link href="/dispatch" className="p-3 rounded-xl bg-slate-50 hover:bg-cyan-50/50 border border-slate-200/80 transition group">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 mx-auto flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition">
              7
            </div>
            <div className="text-xs font-semibold text-slate-900">Dispatch</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{pendingDispatches.length} Orders Due</div>
          </Link>

          <Link href="/accounts" className="p-3 rounded-xl bg-slate-50 hover:bg-orange-50/50 border border-slate-200/80 transition group">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 mx-auto flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition">
              8
            </div>
            <div className="text-xs font-semibold text-slate-900">Accounts</div>
            <div className="text-[10px] text-slate-500 mt-0.5">3-Way Match</div>
          </Link>
        </div>
      </div>

      {/* Operational Two-Column Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Departmental Real-Time Worklists (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Batches Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Active Manufacturing Batches (BMR)</h3>
                <p className="text-xs text-slate-500">Live synthesis and stage execution on plant lines</p>
              </div>
              <Link href="/production" className="text-xs font-medium text-blue-600 hover:underline">
                View all batches
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {activeBatches.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No active batches in progress</div>
              ) : (
                activeBatches.map((b) => (
                  <div key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-xs text-slate-900">{b.batchNumber}</span>
                        <Badge status={b.status} />
                      </div>
                      <div className="text-xs font-medium text-slate-700">
                        {b.productionOrder.product.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Planned: {formatQuantity(b.plannedQuantity, b.unit)} • Order: {b.productionOrder.orderNumber}
                      </div>
                    </div>
                    <Link
                      href={`/production/batches/${b.id}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition"
                    >
                      BMR Record
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Quarantine Releases */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quarantine Lots Awaiting Release</h3>
                <p className="text-xs text-slate-500">Materials restricted until authorized QC test completion</p>
              </div>
              <Link href="/qc" className="text-xs font-medium text-rose-600 hover:underline">
                Open QC workbench
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {lotsPendingQC.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No materials currently quarantined</div>
              ) : (
                lotsPendingQC.map((lot) => (
                  <div key={lot.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-xs text-slate-900">{lot.lotNumber}</span>
                        <Badge status={lot.status} />
                      </div>
                      <div className="text-xs font-medium text-slate-800">{lot.material?.name || "Raw Material"}</div>
                      <div className="text-[11px] text-slate-500">
                        Quantity: {formatQuantity(lot.currentQuantity, lot.unit)} • Supplier Batch: {lot.supplierBatchNumber || "N/A"}
                      </div>
                    </div>
                    <Link
                      href="/qc"
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
                    >
                      Perform QC
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Immutable Audit Stream & Fast Jump (1 col) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-slate-500" />
                Live Audit Trail
              </h3>
              <Link href="/audit" className="text-xs text-blue-600 hover:underline">
                Full logs
              </Link>
            </div>

            <div className="space-y-3">
              {recentAudits.map((a) => (
                <div key={a.id} className="text-xs p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{a.action}</span>
                    <span className="text-[10px] text-slate-400">{formatDate(a.timestamp, true)}</span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    <span className="font-mono font-medium text-slate-800">{a.documentNumber || a.entityType}</span> by {a.actorName || a.actorEmail || "System"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Deepak Cellulose Info</div>
            <div className="text-sm font-bold">Cellulose Ether & Derivatives Plant</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Specialized manufacturing of Microcrystalline Cellulose (Pharma IP/BP/USP), Sodium CMC, and HPMC film coating excipients.
            </p>
            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
              <span>GMP & ISO 9001:2015</span>
              <a
                href="https://deepakcellulose.com/"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                deepakcellulose.com <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
