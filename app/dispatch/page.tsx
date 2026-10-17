import React from "react";
import prisma from "@/lib/db";
import { formatCurrency, formatQuantity, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Truck, CheckCircle2, Clock, FileText, ShoppingBag, ArrowRight } from "lucide-react";
import { DispatchActions, ConfirmDispatchButton, CreateCustomerOrderButton } from "./DispatchActions";

export const dynamic = "force-dynamic";

export default async function DispatchPage() {
  const [customerOrders, dispatches, availableFGLots, customers, products] = await Promise.all([
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
    prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const allocatedChallans = dispatches.filter((d) => d.status === "ALLOCATED" || d.status === "DRAFT").length;
  const dispatchedChallans = dispatches.filter((d) => d.status === "DISPATCHED" || d.status === "DELIVERED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Customer Orders, Dispatch & Logistics</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Create customer sales contracts, allocate QC-released excipient lots, generate delivery challans & confirm outbound exit.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <CreateCustomerOrderButton
            customers={JSON.parse(JSON.stringify(customers))}
            products={JSON.parse(JSON.stringify(products))}
          />
          <DispatchActions
            customerOrders={JSON.parse(JSON.stringify(customerOrders))}
            availableFGLots={JSON.parse(JSON.stringify(availableFGLots))}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
            Active Customer Orders
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{customerOrders.length} Orders</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Commercial pharma formulation contracts</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Allocated Staging Bay
          </div>
          <div className="text-xl font-bold text-amber-600 mt-1">{allocatedChallans} Challans</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Stock reserved awaiting outbound gate exit</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Completed Physical Dispatches
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{dispatchedChallans} Dispatched</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Inventory reduced & sales invoice posted</div>
        </div>
      </div>

      {/* Customer Orders Register */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Customer Sales Orders Register</h2>
            <p className="text-xs text-slate-500">Pharma client purchase requisitions for finished excipients</p>
          </div>
          <span className="text-xs text-blue-600 font-semibold">{customerOrders.length} Orders</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Customer & PO Ref</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Ordered Products</th>
                <th className="py-3 px-4">Fulfillment Progress</th>
                <th className="py-3 px-4">Order Value</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {customerOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No customer orders created yet. Click "+ New Customer Order" above to create one.
                  </td>
                </tr>
              ) : (
                customerOrders.map((order) => {
                  const totalOrdered = order.lines.reduce((s, l) => s + Number(l.orderedQuantity), 0);
                  const totalDispatched = order.lines.reduce((s, l) => s + Number(l.dispatchedQuantity), 0);
                  const pct = totalOrdered > 0 ? Math.round((totalDispatched / totalOrdered) * 100) : 0;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{order.customer.name}</div>
                        <div className="text-[11px] text-slate-500">
                          Client PO: <span className="font-mono text-slate-700">{order.customerPoNumber}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(order.orderDate)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {order.lines.map((l) => (
                            <div key={l.id} className="text-[11px]">
                              <span className="font-semibold text-slate-800">{l.product?.name}</span>:{" "}
                              {Number(l.orderedQuantity)} {l.unit} @ ₹{Number(l.unitPrice)}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1 w-32">
                          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                            <span>{totalDispatched} / {totalOrdered} KG</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={order.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Challans Register */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Outbound Delivery Challans & Gate Clearance</h2>
            <p className="text-xs text-slate-500">Commercial dispatch documents linked to QC-released lots</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">Auto-deducts FG Lot balance</span>
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
                <th className="py-3 px-4 text-right">Gate Exit & Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {dispatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No dispatch challans generated yet. Create a customer order first, then click "New Dispatch Challan".
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
                        <div className="text-[11px] text-slate-400 font-mono">
                          Order: {d.customerOrder.orderNumber} • PO: {d.customerOrder.customerPoNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{d.vehicleNumber || "Pending Truck"}</div>
                        <div className="text-[11px] text-slate-400">
                          {d.transporterName} {d.lrNumber ? `• LR: ${d.lrNumber}` : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {d.lines.map((l) => (
                            <div key={l.id} className="text-[11px] text-slate-600">
                              <span className="font-semibold text-slate-800">{l.product.name}</span>
                              {l.allocations.map((a) => (
                                <div key={a.id} className="text-[10px] text-blue-700 pl-2">
                                  ↳ Lot: <strong>{a.finishedGoodsLot.lotNumber}</strong> ({formatQuantity(a.allocatedQuantity, a.unit)})
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatQuantity(totalQty, "KG")}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(d.dispatchDate)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={d.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAllocated ? (
                          <ConfirmDispatchButton dispatchId={d.id} />
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-600 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Dispatched & Billed
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
    </div>
  );
}
