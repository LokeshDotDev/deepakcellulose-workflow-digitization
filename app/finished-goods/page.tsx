import React from "react";
import prisma from "@/lib/db";
import { formatQuantity, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Boxes, PackageCheck, AlertCircle, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FinishedGoodsPage() {
  const [fgLots, fgReceipts, products] = await Promise.all([
    prisma.finishedGoodsLot.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        receipt: { include: { packagingType: true, batch: true } },
      },
    }),
    prisma.finishedGoodsReceipt.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        batch: true,
        packagingType: true,
      },
    }),
    prisma.product.findMany({ where: { isActive: true } }),
  ]);

  const availableLots = fgLots.filter((l) => l.status === "AVAILABLE" || l.status === "QC_APPROVED");
  const reservedLots = fgLots.filter((l) => Number(l.reservedQuantity) > 0);
  const pendingQCLots = fgLots.filter((l) => l.status === "PENDING_QC");

  const totalStockKG = fgLots.reduce((acc, l) => acc + Number(l.currentQuantity), 0);
  const totalAvailableKG = availableLots.reduce(
    (acc, l) => acc + (Number(l.currentQuantity) - Number(l.reservedQuantity)),
    0
  );
  const totalReservedKG = fgLots.reduce((acc, l) => acc + Number(l.reservedQuantity), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
              <Boxes className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Finished Goods Warehouse & Excipient Stores</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Climate-controlled excipient inventory, packaging drum counts, release gating & dispatch reservations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dispatch"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            Allocate To Dispatch
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Available for Customer Dispatch
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{formatQuantity(totalAvailableKG, "KG")}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{availableLots.length} QC-released batches ready for sale</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Reserved for Outbound Orders
          </div>
          <div className="text-xl font-bold text-amber-600 mt-1">{formatQuantity(totalReservedKG, "KG")}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Allocated on active dispatch challans</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Physical Stock in Hub</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{formatQuantity(totalStockKG, "KG")}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{fgLots.length} tracked production lots</div>
        </div>
      </div>

      {/* Finished Goods Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Finished Goods Inventory Register</h2>
            <p className="text-xs text-slate-500">Pharma excipients classified by grade, packaging type & expiry</p>
          </div>
          <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            FIFO/FEFO Ready
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">FG Lot Number</th>
                <th className="py-3 px-4">Product & Grade</th>
                <th className="py-3 px-4">Packaging Type</th>
                <th className="py-3 px-4">Physical Qty</th>
                <th className="py-3 px-4">Reserved Qty</th>
                <th className="py-3 px-4">Dispatchable Available</th>
                <th className="py-3 px-4">Shelf Life / Expiry</th>
                <th className="py-3 px-4">Release Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {fgLots.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No finished goods recorded in warehouse yet.
                  </td>
                </tr>
              ) : (
                fgLots.map((lot) => {
                  const available = Number(lot.currentQuantity) - Number(lot.reservedQuantity);
                  const isEligibleForDispatch = lot.status === "AVAILABLE" || lot.status === "QC_APPROVED";

                  return (
                    <tr key={lot.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {lot.lotNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{lot.product.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {lot.product.code} • {lot.product.grade || "Pharma IP/BP/USP"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {lot.receipt?.packagingType?.name || "50KG Fiber Drum"}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatQuantity(lot.currentQuantity, lot.unit)}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-600 font-semibold">
                        {Number(lot.reservedQuantity) > 0 ? formatQuantity(lot.reservedQuantity, lot.unit) : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${isEligibleForDispatch ? "text-emerald-700" : "text-slate-400"}`}>
                          {isEligibleForDispatch ? formatQuantity(available, lot.unit) : "Locked (Pending QC)"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatDate(lot.expiryDate)}
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
    </div>
  );
}
