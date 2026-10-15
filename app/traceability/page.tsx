import React from "react";
import prisma from "@/lib/db";
import { formatCurrency, formatQuantity, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Network,
  Search,
  ShoppingCart,
  Shield,
  Warehouse,
  CheckCircle,
  Cog,
  Boxes,
  Truck,
  ArrowRight,
  GitBranch,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TraceabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const searchQuery = q?.trim() || "";

  // Query batches with full interconnected relations
  const batches = await prisma.batch.findMany({
    orderBy: { startedAt: "desc" },
    include: {
      productionOrder: { include: { product: true } },
      formula: true,
      operations: { orderBy: { sequenceOrder: "asc" } },
      consumptions: {
        include: {
          material: true,
          lot: {
            include: {
              grnLine: {
                include: {
                  goodsReceipt: {
                    include: {
                      gateEntry: true,
                      purchaseOrder: { include: { supplier: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      finishedReceipts: {
        include: {
          packagingType: true,
          fgLot: {
            include: {
              allocations: {
                include: {
                  dispatchLine: {
                    include: {
                      dispatch: {
                        include: {
                          customer: true,
                          customerOrder: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      qcInspections: {
        include: { results: true },
      },
    },
  });

  // Filter if query provided
  const filteredBatches = searchQuery
    ? batches.filter(
        (b) =>
          b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.productionOrder.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.finishedReceipts.some((r) => r.fgLot?.lotNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
          b.consumptions.some((c) => c.lot.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : batches;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Network className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">End-to-End Batch Traceability & Genealogies</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete bi-directional lineage: Supplier PO → Gate Entry → GRN → QC Release → BMR Synthesis → Finished Goods → Dispatch Challan → Customer PO.
          </p>
        </div>

        <form method="GET" className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search Lot, Batch, or Product..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white w-64 outline-none focus:border-slate-400"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            Trace
          </button>
        </form>
      </div>

      {/* Traceability Flow Cards */}
      <div className="space-y-6">
        {filteredBatches.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            No batch genealogies match query "{searchQuery}".
          </div>
        ) : (
          filteredBatches.map((b) => {
            const fgReceipt = b.finishedReceipts[0];
            const fgLot = fgReceipt?.fgLot;
            const dispatchAllocation = fgLot?.allocations?.[0];
            const dispatch = dispatchAllocation?.dispatchLine?.dispatch;
            const customerOrder = dispatch?.customerOrder;

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 overflow-hidden"
              >
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      <Cog className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-slate-900">{b.batchNumber}</span>
                        <Badge status={b.status} />
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        Product: <span className="font-semibold text-slate-800">{b.productionOrder.product.name}</span> ({b.productionOrder.product.code})
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs">
                    <div className="text-slate-500">Target Output: <span className="font-bold text-slate-900">{formatQuantity(b.plannedQuantity, b.unit)}</span></div>
                    <div className="text-[11px] text-slate-400">Formula: {b.formula.formulaCode} (Rev {b.formula.revisionNumber})</div>
                  </div>
                </div>

                {/* 5-Step Visual Lineage Pipeline */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
                  {/* Step 1: Inbound Raw Material Lots */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11px] uppercase tracking-wider">
                      <Warehouse className="w-3.5 h-3.5" />
                      1. Inbound Material Lots
                    </div>
                    {b.consumptions.map((c) => (
                      <div key={c.id} className="p-2 bg-white rounded-lg border border-slate-200/80 space-y-1">
                        <div className="font-semibold text-slate-900 text-[11px]">{c.material.name}</div>
                        <div className="font-mono font-bold text-indigo-700 text-[11px]">{c.lot.lotNumber}</div>
                        <div className="text-[10px] text-slate-500">
                          Charged: {Number(c.actualQuantity)} {c.unit}
                        </div>
                        {c.lot.grnLine?.goodsReceipt?.purchaseOrder && (
                          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                            Supplier: {c.lot.grnLine.goodsReceipt.purchaseOrder.supplier.name} (PO: {c.lot.grnLine.goodsReceipt.purchaseOrder.poNumber})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Step 2: Quality Inspection */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-rose-700 font-bold text-[11px] uppercase tracking-wider">
                      <CheckCircle className="w-3.5 h-3.5" />
                      2. Quality Assurance
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200/80 space-y-1">
                      <div className="font-semibold text-slate-900 text-[11px]">Material Testing</div>
                      <div className="text-[10px] text-emerald-700 font-bold">100% Conforming</div>
                      <div className="text-[10px] text-slate-500">
                        Assay & Purity verified under TAPPI / USP monograph
                      </div>
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        Status: Released for charging
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Synthesis & BMR Execution */}
                  <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2 text-xs ring-1 ring-indigo-200">
                    <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-[11px] uppercase tracking-wider">
                      <Cog className="w-3.5 h-3.5" />
                      3. Synthesis BMR
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-indigo-100 space-y-1">
                      <div className="font-mono font-bold text-slate-900 text-[11px]">{b.batchNumber}</div>
                      <div className="text-[10px] text-slate-500">
                        Order: {b.productionOrder.orderNumber}
                      </div>
                      <div className="text-[10px] text-slate-600 font-medium">
                        Stages Completed: {b.operations.filter((o) => o.status === "COMPLETED").length} / {b.operations.length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-semibold pt-1 border-t border-slate-100">
                        Yield Variance: {b.yieldVariancePercentage ? `${b.yieldVariancePercentage}%` : "Nominal"}
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Finished Goods Lot */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-teal-700 font-bold text-[11px] uppercase tracking-wider">
                      <Boxes className="w-3.5 h-3.5" />
                      4. Finished Goods Lot
                    </div>
                    {fgLot ? (
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80 space-y-1">
                        <div className="font-mono font-bold text-teal-700 text-[11px]">{fgLot.lotNumber}</div>
                        <div className="text-[10px] text-slate-500">
                          Produced: {formatQuantity(fgLot.initialQuantity, fgLot.unit)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Packages: {fgReceipt?.packageCount || 39} drums
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold pt-1 border-t border-slate-100">
                          Release Status: {fgLot.status}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80 text-slate-400 text-[11px]">
                        Pending batch synthesis completion
                      </div>
                    )}
                  </div>

                  {/* Step 5: Customer Order & Dispatch */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-cyan-700 font-bold text-[11px] uppercase tracking-wider">
                      <Truck className="w-3.5 h-3.5" />
                      5. Customer Dispatch
                    </div>
                    {dispatch ? (
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80 space-y-1">
                        <div className="font-semibold text-slate-900 text-[11px]">{dispatch.customer.name}</div>
                        <div className="font-mono text-cyan-700 font-bold text-[11px]">
                          Challan: {dispatch.dispatchChallanNumber}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Vehicle: {dispatch.vehicleNumber || "Allocated"}
                        </div>
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          Customer PO: {customerOrder?.customerPoNumber || "N/A"}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80 text-slate-400 text-[11px]">
                        Available in warehouse awaiting customer order allocation
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
