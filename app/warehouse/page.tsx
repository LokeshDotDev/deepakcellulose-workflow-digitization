import React from "react";
import prisma from "@/lib/db";
import { formatQuantity, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Warehouse as WarehouseIcon, Boxes, ArrowRightLeft, ShieldAlert } from "lucide-react";
import { WarehouseActions } from "./WarehouseActions";

export const dynamic = "force-dynamic";

export default async function WarehousePage() {
  const [goodsReceipts, inventoryLots, ledgerEntries, gateEntries, warehouses, materials] = await Promise.all([
    prisma.goodsReceipt.findMany({
      orderBy: { receiptDate: "desc" },
      include: {
        supplier: true,
        purchaseOrder: true,
        lines: { include: { material: true } },
      },
    }),
    prisma.inventoryLot.findMany({
      where: { entityType: "RAW_MATERIAL" },
      orderBy: { createdAt: "desc" },
      include: {
        material: true,
        warehouse: true,
        location: true,
      },
    }),
    prisma.inventoryLedgerEntry.findMany({
      orderBy: { timestamp: "desc" },
      take: 10,
      include: { lot: true },
    }),
    prisma.gateEntry.findMany({
      include: { supplier: true },
    }),
    prisma.warehouse.findMany({
      where: { isActive: true },
    }),
    prisma.material.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const availableStockLots = inventoryLots.filter((l) => l.status === "AVAILABLE" || l.status === "QC_APPROVED");
  const quarantinedStockLots = inventoryLots.filter((l) => l.status === "RECEIVED_PENDING_QC" || l.status === "QUARANTINED");

  const totalAvailableKG = availableStockLots.reduce((acc, l) => acc + Number(l.currentQuantity), 0);
  const totalQuarantineKG = quarantinedStockLots.reduce((acc, l) => acc + Number(l.currentQuantity), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <WarehouseIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Raw Material Stores & Inventory Ledger</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Goods receipts (GRN), bin allocations, quarantine hold status & immutable stock movement ledger.
          </p>
        </div>

        <WarehouseActions
          gateEntries={JSON.parse(JSON.stringify(gateEntries))}
          warehouses={JSON.parse(JSON.stringify(warehouses))}
          materials={JSON.parse(JSON.stringify(materials))}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Production-Available RM Stock</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{formatQuantity(totalAvailableKG, "KG")}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{availableStockLots.length} released lots in Central Store</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            Quarantine & Pending QC Hold
          </div>
          <div className="text-xl font-bold text-amber-600 mt-1">{formatQuantity(totalQuarantineKG, "KG")}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">{quarantinedStockLots.length} restricted lots awaiting QC release</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Goods Receipts (GRN)</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{goodsReceipts.length} GRNs Logged</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Physical deliveries verified</div>
        </div>
      </div>

      {/* Live Inventory Lots Register */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Current Raw Material Lots in Warehouse</h2>
            <p className="text-xs text-slate-500">Tracked by internal lot, supplier heat/batch & physical rack</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">Real-time Stock Balances</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Lot Number</th>
                <th className="py-3 px-4">Material</th>
                <th className="py-3 px-4">Warehouse & Rack Location</th>
                <th className="py-3 px-4">Available Quantity</th>
                <th className="py-3 px-4">Reserved Quantity</th>
                <th className="py-3 px-4">Supplier Batch</th>
                <th className="py-3 px-4">QC Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {inventoryLots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No inventory lots in warehouse yet.
                  </td>
                </tr>
              ) : (
                inventoryLots.map((lot) => {
                  const available = Number(lot.currentQuantity) - Number(lot.reservedQuantity);
                  return (
                    <tr key={lot.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {lot.lotNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{lot.material?.name || "Raw Material"}</div>
                        <div className="text-[11px] text-slate-400">{lot.material?.code}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{lot.warehouse.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{lot.location?.code || "Default Bin"}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatQuantity(available, lot.unit)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatQuantity(lot.reservedQuantity, lot.unit)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {lot.supplierBatchNumber || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={lot.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Append-Only Stock Movement Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-slate-600" />
              Append-Only Stock Movement Ledger (Audit Source of Truth)
            </h2>
            <p className="text-xs text-slate-500">Immutable transaction history for every gram of material movement</p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Audit Compliant
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Txn Number</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Quantity Moved</th>
                <th className="py-2.5 px-4">Lot Number</th>
                <th className="py-2.5 px-4">Status Transition</th>
                <th className="py-2.5 px-4">Reference Document & Reason</th>
                <th className="py-2.5 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {ledgerEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 transition text-[11px]">
                  <td className="py-2.5 px-4 font-mono font-medium text-slate-800">
                    {entry.transactionNumber}
                  </td>
                  <td className="py-2.5 px-4">
                    <Badge variant="default">{entry.transactionType.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">
                    {formatQuantity(entry.quantity, entry.unit)}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">
                    {entry.lot?.lotNumber || "-"}
                  </td>
                  <td className="py-2.5 px-4">
                    {entry.fromStatus && entry.toStatus ? (
                      <span className="text-slate-600">
                        {entry.fromStatus} → <span className="font-semibold text-slate-900">{entry.toStatus}</span>
                      </span>
                    ) : (
                      entry.toStatus || "-"
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    <div className="font-medium text-slate-800">{entry.referenceType}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">{entry.reason || "-"}</div>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500">
                    {formatDate(entry.timestamp, true)}
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
