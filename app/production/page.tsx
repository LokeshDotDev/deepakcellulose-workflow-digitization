import React from "react";
import prisma from "@/lib/db";
import { formatQuantity, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Cog, CheckCircle2, Clock, Layers, AlertCircle, ArrowRight } from "lucide-react";
import { ProductionActions, StartBatchButton } from "./ProductionActions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const [productionOrders, batches, formulas, products] = await Promise.all([
    prisma.productionOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        formula: true,
        batches: true,
      },
    }),
    prisma.batch.findMany({
      orderBy: { startedAt: "desc" },
      include: {
        productionOrder: { include: { product: true } },
        formula: true,
        consumptions: { include: { material: true, lot: true } },
        operations: { orderBy: { sequenceOrder: "asc" } },
      },
    }),
    prisma.formula.findMany({
      where: { status: "APPROVED" },
      include: {
        product: true,
        lines: { include: { material: true } },
        stages: { orderBy: { sequenceOrder: "asc" } },
      },
    }),
    prisma.product.findMany({ where: { isActive: true } }),
  ]);

  const activeBatchesCount = batches.filter((b) => b.status === "IN_PROGRESS").length;
  const completedBatchesCount = batches.filter((b) => b.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Cog className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Manufacturing Planning & BMR Execution</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standard formulas (BOM), batch manufacturing records, stage checklists, raw material issues & yield tracking.
          </p>
        </div>

        <ProductionActions
          products={JSON.parse(JSON.stringify(products))}
          formulas={JSON.parse(JSON.stringify(formulas))}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            Active BMR Batches in Progress
          </div>
          <div className="text-xl font-bold text-indigo-600 mt-1">{activeBatchesCount} Batches</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Undergoing reactor synthesis or spray drying</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Completed Manufacturing Batches
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{completedBatchesCount} Batches</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Transferred to Finished Goods Store</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Approved Process Formulas</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{formulas.length} Master Recipes</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Versioned bills of materials</div>
        </div>
      </div>

      {/* Active Batches Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Batch Manufacturing Records (BMR)</h2>
            <p className="text-xs text-slate-500">Traceable link between consumed raw material lots & finished goods</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">BMR Compliance Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Planned Output</th>
                <th className="py-3 px-4">Consumed RM Lots</th>
                <th className="py-3 px-4">Current Stage Progress</th>
                <th className="py-3 px-4">Started At</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No manufacturing batches recorded yet.
                  </td>
                </tr>
              ) : (
                batches.map((b) => {
                  const completedOps = b.operations.filter((op) => op.status === "COMPLETED").length;
                  const totalOps = b.operations.length;
                  const progressPct = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {b.batchNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{b.productionOrder.product.name}</div>
                        <div className="text-[11px] text-slate-400">Formula: {b.formula.formulaCode}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatQuantity(b.plannedQuantity, b.unit)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {b.consumptions.map((c) => (
                            <div key={c.id} className="text-[11px] text-slate-600">
                              <span className="font-medium text-slate-800">{c.material.name}</span>:{" "}
                              {Number(c.actualQuantity)} {c.unit} (Lot: <span className="font-mono">{c.lot.lotNumber}</span>)
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1 w-28">
                          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                            <span>Stage {completedOps}/{totalOps}</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatDate(b.startedAt, true)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={b.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/production/batches/${b.id}`}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          View BMR <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Production Orders</h2>
          <span className="text-xs text-slate-400 font-medium">Scheduled Campaigns</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Order Number</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Planned Output</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Target Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {productionOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                    {ord.orderNumber}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {ord.product.name}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {formatQuantity(ord.plannedQuantity, ord.unit)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {ord.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {formatDate(ord.targetCompletionDate)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge status={ord.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    {ord.status === "PLANNED" && (
                      <StartBatchButton orderId={ord.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
