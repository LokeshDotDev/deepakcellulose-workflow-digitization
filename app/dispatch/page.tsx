import React from "react";
import prisma from "@/lib/db";
import { formatCurrency, formatQuantity, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Truck, CheckCircle2, Clock, FileText, ArrowRight } from "lucide-react";
import { DispatchActions, ConfirmDispatchButton } from "./DispatchActions";

export const dynamic = "force-dynamic";

export default async function DispatchPage() {
  const [customerOrders, dispatches, availableFGLots] = await Promise.all([
    prisma.customerOrder.findMany({
      orderBy: { orderDate: "desc" },
      include: {
        customer: true,
        lines: { include: { product: true } },
      },
    }),
    prisma.dispatch.findMany({
      orderBy: { dispatchDate: "desc" },
      include: {
        customer: true,
        customerOrder: true,
        lines: {
          include: {
            product: true,
            allocations: { include: { finishedGoodsLot: true } },
          },
        },
      },
    }),
    prisma.finishedGoodsLot.findMany({
      where: { status: { in: ["AVAILABLE", "QC_APPROVED"] } },
      include: { product: true, receipt: { include: { batch: true } } },
    }),
  ]);

  const allocatedChallans = dispatches.filter((d) => d.status === "ALLOCATED" || d.status === "DRAFT").length;
  const dispatchedChallans = dispatches.filter((d) => d.status === "DISPATCHED" || d.status === "DELIVERED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-100 text-cyan-700 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Customer Orders, Dispatch & Logistics</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Finished goods allocation, delivery challans, transporter assignments & transactional stock deduction.
          </p>
        </div>

        <DispatchActions
          customerOrders={JSON.parse(JSON.stringify(customerOrders))}
          availableFGLots={JSON.parse(JSON.stringify(availableFGLots))}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-500" />
            Allocated Awaiting Vehicle Exit
          </div>
          <div className="text-xl font-bold text-cyan-700 mt-1">{allocatedChallans} Challans</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Stock reserved in staging bay</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Confirmed Physical Dispatches
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{dispatchedChallans} Dispatched</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Inventory reduced & sales invoice generated</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Customer Orders</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{customerOrders.length} Orders</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active formulation excipient contracts</div>
        </div>
      </div>

      {/* Dispatch Challans Register */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Dispatch Challans Register</h2>
            <p className="text-xs text-slate-500">Commercial delivery documents linked to batch lots</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">Real-time Stock Integration</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Challan Number</th>
                <th className="py-3 px-4">Customer & Order Ref</th>
                <th className="py-3 px-4">Transporter & Truck</th>
                <th className="py-3 px-4">Allocated Lot Lines</th>
                <th className="py-3 px-4">Dispatched Qty</th>
                <th className="py-3 px-4">Dispatch Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {dispatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No dispatch challans generated yet.
                  </td>
                </tr>
              ) : (
                dispatches.map((d) => {
                  const totalQty = d.lines.reduce((s, l) => s + Number(l.quantity), 0);
                  const isAllocated = d.status === "ALLOCATED" || d.status === "DRAFT";

                  return (
                    <tr key={d.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {d.dispatchChallanNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{d.customer.name}</div>
                        <div className="text-[11px] text-slate-400">
                          Order: {d.customerOrder.orderNumber} (Cust PO: {d.customerOrder.customerPoNumber})
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{d.vehicleNumber || "Pending Truck"}</div>
                        <div className="text-[11px] text-slate-500">{d.transporterName || "Direct Pickup"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {d.lines.map((l) => (
                            <div key={l.id} className="text-[11px] text-slate-600">
                              <span className="font-medium text-slate-800">{l.product.name}</span>:{" "}
                              {l.allocations.map((a) => (
                                <span key={a.id} className="font-mono text-cyan-700">
                                  Lot: {a.finishedGoodsLot.lotNumber} ({Number(a.allocatedQuantity)} {a.unit})
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatQuantity(totalQty, "KG")}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatDate(d.dispatchDate)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={d.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAllocated ? (
                          <ConfirmDispatchButton dispatchId={d.id} />
                        ) : (
                          <span className="text-emerald-700 font-semibold text-[11px] flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Exited & Invoiced
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Orders Fulfillment Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Active Customer Purchase Contracts</h2>
          <span className="text-xs text-slate-400 font-medium">Order Fulfillment Progress</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Order Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Customer PO Ref</th>
                <th className="py-3 px-4">Ordered Products</th>
                <th className="py-3 px-4">Dispatched vs Ordered</th>
                <th className="py-3 px-4">Total Contract Value</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {customerOrders.map((ord) => {
                const totalOrd = ord.lines.reduce((s, l) => s + Number(l.orderedQuantity), 0);
                const totalDisp = ord.lines.reduce((s, l) => s + Number(l.dispatchedQuantity), 0);
                const pct = totalOrd > 0 ? Math.round((totalDisp / totalOrd) * 100) : 0;

                return (
                  <tr key={ord.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {ord.orderNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {ord.customer.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {ord.customerPoNumber}
                    </td>
                    <td className="py-3 px-4">
                      {ord.lines.map((l) => (
                        <div key={l.id} className="text-[11px] text-slate-600">
                          {l.product.name} ({Number(l.orderedQuantity)} {l.unit})
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1 w-28">
                        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                          <span>{totalDisp} / {totalOrd} KG</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 rounded-full"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {formatCurrency(ord.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={ord.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
