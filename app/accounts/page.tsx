import React from "react";
import prisma from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Receipt, CheckCircle2, AlertTriangle, ArrowRightLeft, DollarSign } from "lucide-react";
import { VerifyThreeWayMatchButton, MarkPaidButton } from "./AccountsActions";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [supplierInvoices, salesInvoices, reconciliations] = await Promise.all([
    prisma.supplierInvoice.findMany({
      orderBy: { invoiceDate: "desc" },
      include: {
        supplier: true,
        purchaseOrder: true,
        goodsReceipt: true,
      },
    }),
    prisma.salesInvoice.findMany({
      orderBy: { invoiceDate: "desc" },
      include: {
        customer: true,
        customerOrder: true,
        dispatch: true,
      },
    }),
    prisma.accountsReconciliation.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalPayables = supplierInvoices
    .filter((inv) => inv.paymentStatus === "PENDING")
    .reduce((s, inv) => s + Number(inv.totalAmount), 0);

  const totalReceivables = salesInvoices
    .filter((inv) => inv.paymentStatus === "PENDING")
    .reduce((s, inv) => s + Number(inv.totalAmount), 0);

  const matchedCount = supplierInvoices.filter((i) => i.threeWayMatchStatus === "MATCHED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Finance & Commercial Reconciliation</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Inbound 3-way matching (PO vs GRN vs Vendor Invoice), customer billing from dispatches & receivables.
          </p>
        </div>

        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          3-Way Commercial Audit Enforced
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            3-Way Verified Supplier Invoices
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{matchedCount} Invoices Matched</div>
          <div className="text-[11px] text-slate-400 mt-0.5">PO rates & GRN received weights strictly match</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Outstanding Payables</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totalPayables)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Verified supplier bills due</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Outstanding Receivables</div>
          <div className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(totalReceivables)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Customer invoices from confirmed dispatches</div>
        </div>
      </div>

      {/* Supplier Invoices (3-Way Matching Table) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Inbound 3-Way Reconciliation (PO ↔ GRN ↔ Vendor Invoice)</h2>
            <p className="text-xs text-slate-500">Cross-verifies quantities, unit rates and statutory tax totals</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">Automated Discrepancy Detection</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Invoice Number</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">PO Reference</th>
                <th className="py-3 px-4">GRN Reference</th>
                <th className="py-3 px-4">Billed Amount</th>
                <th className="py-3 px-4">3-Way Match</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {supplierInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No supplier invoices recorded yet.
                  </td>
                </tr>
              ) : (
                supplierInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inv.supplier.name}</div>
                      <div className="text-[11px] text-slate-400">Due: {formatDate(inv.dueDate)}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {inv.purchaseOrder?.poNumber || "N/A"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {inv.goodsReceipt?.grnNumber || "N/A"}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={inv.threeWayMatchStatus} />
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={inv.paymentStatus} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <VerifyThreeWayMatchButton invoiceId={inv.id} />
                        <MarkPaidButton
                          invoiceId={inv.id}
                          invoiceType="SUPPLIER"
                          currentStatus={inv.paymentStatus}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Sales Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Customer Sales Invoices (Generated from Dispatches)</h2>
            <p className="text-xs text-slate-500">Commercial billing generated automatically upon vehicle exit</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">Sales Ledger</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Invoice Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Customer Order Ref</th>
                <th className="py-3 px-4">Dispatch Challan</th>
                <th className="py-3 px-4">Invoice Date</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {salesInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No sales invoices generated yet. Confirm a dispatch to automatically create invoices.
                  </td>
                </tr>
              ) : (
                salesInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {inv.customer.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {inv.customerOrder.orderNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-700">
                      {inv.dispatch?.dispatchChallanNumber || "Direct"}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={inv.paymentStatus} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <MarkPaidButton
                        invoiceId={inv.id}
                        invoiceType="SALES"
                        currentStatus={inv.paymentStatus}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
