import React from "react";
import prisma from "@/lib/db";
import { formatCurrency, formatQuantity, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Download, Printer, Filter } from "lucide-react";
import { ExportButton } from "./ExportButton";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [lots, batches, qcInspections, dispatches] = await Promise.all([
    prisma.inventoryLot.findMany({
      include: { material: true, product: true, warehouse: true },
    }),
    prisma.batch.findMany({
      include: { productionOrder: { include: { product: true } }, formula: true },
    }),
    prisma.qCInspection.findMany({
      include: { lot: { include: { material: true, product: true } }, results: true },
    }),
    prisma.dispatch.findMany({
      include: { customer: true, customerOrder: true },
    }),
  ]);

  // Format data for CSV Export
  const inventoryExportData = lots.map((l) => ({
    LotNumber: l.lotNumber,
    Type: l.entityType,
    ItemName: l.material?.name || l.product?.name || "N/A",
    Warehouse: l.warehouse.name,
    CurrentQuantity: Number(l.currentQuantity),
    ReservedQuantity: Number(l.reservedQuantity),
    Unit: l.unit,
    Status: l.status,
    SupplierBatch: l.supplierBatchNumber || "-",
    CreatedAt: formatDate(l.createdAt),
  }));

  const productionExportData = batches.map((b) => ({
    BatchNumber: b.batchNumber,
    Product: b.productionOrder.product.name,
    Formula: b.formula.formulaCode,
    PlannedQuantity: Number(b.plannedQuantity),
    ActualProduced: b.actualQuantityProduced ? Number(b.actualQuantityProduced) : "In Progress",
    YieldVariancePct: b.yieldVariancePercentage ? `${b.yieldVariancePercentage}%` : "0%",
    Status: b.status,
    StartedAt: formatDate(b.startedAt, true),
    CompletedAt: formatDate(b.completedAt, true),
  }));

  const qcExportData = qcInspections.map((qc) => ({
    InspectionNumber: qc.inspectionNumber,
    Stage: qc.stage,
    Item: qc.lot?.material?.name || qc.lot?.product?.name || "N/A",
    LotNumber: qc.lot?.lotNumber || "-",
    COA_Number: qc.coaNumber || "-",
    Status: qc.status,
    InspectionDate: formatDate(qc.inspectionDate),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Operational & Compliance Reports</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data-driven reports, inventory aging, production yields, QC conformance metrics & instant CSV exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton data={inventoryExportData} filename="deepak_inventory_balances" title="Inventory" />
          <ExportButton data={productionExportData} filename="deepak_production_yields" title="Production" />
        </div>
      </div>

      {/* Report 1: Inventory Balances & Status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Inventory Balances by Warehouse Location & Status</h2>
            <p className="text-xs text-slate-500">Live balance breakdown across Raw Materials & Finished Goods</p>
          </div>
          <ExportButton data={inventoryExportData} filename="deepak_inventory_report" title="CSV" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Lot Number</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Item Name</th>
                <th className="py-2.5 px-4">Warehouse</th>
                <th className="py-2.5 px-4">Current Stock</th>
                <th className="py-2.5 px-4">Reserved</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {lots.slice(0, 10).map((lot) => (
                <tr key={lot.id} className="hover:bg-slate-50 transition text-xs">
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{lot.lotNumber}</td>
                  <td className="py-2.5 px-4 text-slate-500 text-[11px]">{lot.entityType}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">{lot.material?.name || lot.product?.name || "Item"}</td>
                  <td className="py-2.5 px-4 text-slate-600">{lot.warehouse.name}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{formatQuantity(lot.currentQuantity, lot.unit)}</td>
                  <td className="py-2.5 px-4 font-mono text-amber-600">{Number(lot.reservedQuantity) > 0 ? formatQuantity(lot.reservedQuantity, lot.unit) : "-"}</td>
                  <td className="py-2.5 px-4"><Badge status={lot.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report 2: Production Batches & Yield Variance */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Manufacturing Batch Performance & Yield Analysis</h2>
            <p className="text-xs text-slate-500">Planned vs actual outputs, variance percentages and cycle times</p>
          </div>
          <ExportButton data={productionExportData} filename="deepak_production_report" title="CSV" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Batch Number</th>
                <th className="py-2.5 px-4">Product Name</th>
                <th className="py-2.5 px-4">Formula Code</th>
                <th className="py-2.5 px-4">Planned Output</th>
                <th className="py-2.5 px-4">Actual Output</th>
                <th className="py-2.5 px-4">Yield Variance</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition text-xs">
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{b.batchNumber}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">{b.productionOrder.product.name}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">{b.formula.formulaCode}</td>
                  <td className="py-2.5 px-4 text-slate-700">{formatQuantity(b.plannedQuantity, b.unit)}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{b.actualQuantityProduced ? formatQuantity(b.actualQuantityProduced, b.unit) : "In Progress"}</td>
                  <td className="py-2.5 px-4 font-semibold text-emerald-700">{b.yieldVariancePercentage ? `${b.yieldVariancePercentage}%` : "Nominal"}</td>
                  <td className="py-2.5 px-4"><Badge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
