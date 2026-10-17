import React from "react";
import prisma from "@/lib/db";
import { formatCurrency, formatQuantity, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, CheckCircle, Clock, Truck, FileText } from "lucide-react";
import { ProcurementActionButtons, PORowActions } from "./ProcurementActions";

export const dynamic = "force-dynamic";

export default async function ProcurementPage() {
  const [purchaseOrders, suppliers, materials, uoms] = await Promise.all([
    prisma.purchaseOrder.findMany({
      orderBy: { orderDate: "desc" },
      include: {
        supplier: true,
        lines: {
          include: { material: true },
        },
      },
    }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.material.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.unitOfMeasure.findMany({ where: { isActive: true } }),
  ]);

  const totalCommitted = purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0);
  const pendingApprovals = purchaseOrders.filter((po) => po.status === "SUBMITTED" || po.status === "DRAFT").length;
  const inTransitOrders = purchaseOrders.filter((po) => po.status === "APPROVED" || po.status === "PARTIALLY_RECEIVED").length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Procurement & Purchase Order Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supplier requisitions, commercial terms, purchase orders & delivery tolerance tracking.
          </p>
        </div>

        <ProcurementActionButtons
          suppliers={JSON.parse(JSON.stringify(suppliers))}
          materials={JSON.parse(JSON.stringify(materials))}
          uoms={JSON.parse(JSON.stringify(uoms))}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total PO Value</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totalCommitted)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{purchaseOrders.length} total purchase orders recorded</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Awaiting Approval</div>
          <div className="text-xl font-bold text-amber-600 mt-1">{pendingApprovals} Orders</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Commercial authorization pending</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Inbound Pipeline</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{inTransitOrders} Orders</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Approved or partially received</div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Purchase Orders Register</h2>
          <span className="text-xs text-slate-500 font-medium">Real-time PostgreSQL Data</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Material Lines</th>
                <th className="py-3 px-4">Fulfillment Status</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No purchase orders recorded yet.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => {
                  const totalOrdered = po.lines.reduce((s, l) => s + Number(l.quantity), 0);
                  const totalReceived = po.lines.reduce((s, l) => s + Number(l.receivedQuantity), 0);
                  const fulfillmentPct = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

                  return (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {po.poNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{po.supplier.name}</div>
                        <div className="text-[11px] text-slate-400">{po.supplier.code} • GST: {po.supplier.gstNumber || "N/A"}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(po.orderDate)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {po.lines.map((l) => (
                            <div key={l.id} className="text-[11px] text-slate-600">
                              <span className="font-medium text-slate-800">{l.material.name}</span>:{" "}
                              {Number(l.quantity)} {po.lines[0]?.material?.type ? "Units" : "KG"}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1 w-32">
                          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                            <span>{totalReceived} / {totalOrdered}</span>
                            <span>{fulfillmentPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.min(fulfillmentPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {formatCurrency(po.totalAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={po.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <PORowActions
                          po={JSON.parse(JSON.stringify(po))}
                          suppliers={JSON.parse(JSON.stringify(suppliers))}
                          materials={JSON.parse(JSON.stringify(materials))}
                          uoms={JSON.parse(JSON.stringify(uoms))}
                        />
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
