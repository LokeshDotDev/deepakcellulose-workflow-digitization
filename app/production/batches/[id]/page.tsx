import React from "react";
import prisma from "@/lib/db";
import { formatQuantity, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Cog, CheckCircle2, Clock, ArrowLeft, Layers, ShieldCheck, Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BMRClientActions } from "./BMRClientActions";

export const dynamic = "force-dynamic";

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [batch, availableLots, packagingTypes, fgWarehouses] = await Promise.all([
    prisma.batch.findUnique({
      where: { id },
      include: {
        productionOrder: { include: { product: true } },
        formula: {
          include: {
            lines: { include: { material: true } },
            stages: { orderBy: { sequenceOrder: "asc" } },
          },
        },
        consumptions: {
          include: { material: true, lot: true },
        },
        operations: { orderBy: { sequenceOrder: "asc" } },
        deviations: true,
      },
    }),
    prisma.inventoryLot.findMany({
      where: { entityType: "RAW_MATERIAL" },
      include: { material: true, warehouse: true },
    }),
    prisma.packagingType.findMany({ where: { isActive: true } }),
    prisma.warehouse.findMany({ where: { type: "FINISHED_GOODS" } }),
  ]);

  if (!batch) {
    notFound();
  }

  const plannedQty = Number(batch.plannedQuantity);
  const actualQty = batch.actualQuantityProduced ? Number(batch.actualQuantityProduced) : null;
  const yieldPct = actualQty ? Math.round((actualQty / plannedQty) * 100 * 10) / 10 : null;

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Link
            href="/production"
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Production Overview
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 font-mono">
              Batch Manufacturing Record: {batch.batchNumber}
            </h1>
            <Badge status={batch.status} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            GMP electronic batch record for {batch.productionOrder.product.name} ({batch.productionOrder.product.code})
          </p>
        </div>

        <BMRClientActions
          batch={JSON.parse(JSON.stringify(batch))}
          availableLots={JSON.parse(JSON.stringify(availableLots))}
          packagingTypes={JSON.parse(JSON.stringify(packagingTypes))}
          fgWarehouses={JSON.parse(JSON.stringify(fgWarehouses))}
        />
      </div>

      {/* Batch Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Target Output</div>
          <div className="text-lg font-bold text-slate-900 mt-1">{formatQuantity(plannedQty, batch.unit)}</div>
          <div className="text-[11px] text-slate-400">Order: {batch.productionOrder.orderNumber}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Formula Revision</div>
          <div className="text-lg font-bold text-indigo-700 mt-1">{batch.formula.formulaCode}</div>
          <div className="text-[11px] text-slate-400">Rev {batch.formula.revisionNumber} (Approved Recipe)</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Synthesis Started</div>
          <div className="text-sm font-bold text-slate-900 mt-1">{formatDate(batch.startedAt, true)}</div>
          <div className="text-[11px] text-slate-400">Operator: Manoj Joshi</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Yield & Output</div>
          <div className="text-lg font-bold text-emerald-700 mt-1">
            {actualQty ? `${formatQuantity(actualQty, batch.unit)} (${yieldPct}%)` : "In Progress"}
          </div>
          <div className="text-[11px] text-slate-400">Expected: {Number(batch.formula.expectedYieldPercentage)}%</div>
        </div>
      </div>

      {/* Material Consumption & Traceability Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Raw Material Lot Consumption (Full Traceability)
            </h2>
            <p className="text-xs text-slate-500">
              Only authorized and QC-released lots can be issued into manufacturing
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Validated Issue
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Raw Material</th>
                <th className="py-3 px-4">Consumed Lot Number</th>
                <th className="py-3 px-4">Planned Qty</th>
                <th className="py-3 px-4">Actual Charged</th>
                <th className="py-3 px-4">Variance</th>
                <th className="py-3 px-4">Issue Slip Ref</th>
                <th className="py-3 px-4">Issued Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {batch.consumptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No materials issued to this batch yet. Click "Issue Raw Material Lot" to charge slurry.
                  </td>
                </tr>
              ) : (
                batch.consumptions.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.material.name}</div>
                      <div className="text-[11px] text-slate-400">{c.material.code}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {c.lot.lotNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatQuantity(c.plannedQuantity, c.unit)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatQuantity(c.actualQuantity, c.unit)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-mono text-xs ${Number(c.variance) === 0 ? "text-slate-500" : "text-amber-600 font-semibold"}`}>
                        {Number(c.variance) > 0 ? `+${Number(c.variance)}` : Number(c.variance)} {c.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {c.issueSlipNumber || "-"}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDate(c.createdAt, true)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Stages Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Configured Manufacturing Stages & Parameters</h2>
          <p className="text-xs text-slate-500">Sequential operations executed on plant production lines</p>
        </div>

        <div className="space-y-3">
          {batch.formula.stages.map((stg) => {
            const op = batch.operations.find((o) => o.stageName === stg.stageName);
            const isCompleted = op?.status === "COMPLETED";
            const isInProgress = op?.status === "IN_PROGRESS";

            return (
              <div
                key={stg.id}
                className={`p-4 rounded-xl border transition ${
                  isCompleted
                    ? "bg-emerald-50/40 border-emerald-200"
                    : isInProgress
                    ? "bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isCompleted
                          ? "bg-emerald-600 text-white"
                          : isInProgress
                          ? "bg-indigo-600 text-white animate-pulse"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {stg.sequenceOrder}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">{stg.stageName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{stg.instructions}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-800"
                          : isInProgress
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isCompleted ? "COMPLETED" : isInProgress ? "IN PROGRESS" : "PENDING"}
                    </span>
                    {stg.mandatoryQCCheck && (
                      <div className="text-[10px] font-semibold text-rose-600 mt-1 flex items-center justify-end gap-1">
                        <ShieldCheck className="w-3 h-3" /> Mandatory In-Process QC
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
