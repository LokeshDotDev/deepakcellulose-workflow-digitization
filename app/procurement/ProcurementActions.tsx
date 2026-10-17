"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Edit2, Trash2, CheckCircle2, XCircle, Send, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProcurementActionButtonsProps {
  suppliers: any[];
  materials: any[];
  uoms: any[];
}

export function ProcurementActionButtons({ suppliers, materials, uoms }: ProcurementActionButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form State
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [expectedDate, setExpectedDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30 Days");
  const [notes, setNotes] = useState("");
  const [statusToSet, setStatusToSet] = useState<"SUBMITTED" | "DRAFT">("SUBMITTED");
  const [lines, setLines] = useState([
    {
      materialId: materials[0]?.id || "",
      quantity: 5000,
      unitId: uoms[0]?.id || "",
      unitPrice: 120,
      taxRate: 18,
    },
  ]);

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        materialId: materials[0]?.id || "",
        quantity: 1000,
        unitId: uoms[0]?.id || "",
        unitPrice: 100,
        taxRate: 18,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent, targetStatus: "SUBMITTED" | "DRAFT") => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch("/api/procurement/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          expectedDeliveryDate: expectedDate,
          paymentTerms,
          notes,
          status: targetStatus,
          lines,
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create PO");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting purchase order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
        <Plus className="w-4 h-4" />
        New Purchase Order
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Purchase Order</h3>
                <p className="text-xs text-slate-500">Generate commercial PO for approved raw material vendor</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white text-slate-800 outline-none"
                    required
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Notes / Specs</label>
                  <input
                    type="text"
                    placeholder="e.g. COA required with consignment"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 outline-none bg-white"
                  />
                </div>
              </div>

              {/* Material Lines */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Purchase Lines</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Material
                  </button>
                </div>

                <div className="space-y-3">
                  {lines.map((line, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">Material</label>
                          <select
                            value={line.materialId}
                            onChange={(e) => handleLineChange(idx, "materialId", e.target.value)}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                          >
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => handleLineChange(idx, "quantity", Number(e.target.value))}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">Unit</label>
                          <select
                            value={line.unitId}
                            onChange={(e) => handleLineChange(idx, "unitId", e.target.value)}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                          >
                            {uoms.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.code} ({u.name})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500">Unit Price (₹):</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => handleLineChange(idx, "unitPrice", Number(e.target.value))}
                              className="w-20 text-xs p-1 rounded border border-slate-300 bg-white"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500">GST %:</span>
                            <input
                              type="number"
                              value={line.taxRate}
                              onChange={(e) => handleLineChange(idx, "taxRate", Number(e.target.value))}
                              className="w-14 text-xs p-1 rounded border border-slate-300 bg-white"
                            />
                          </div>
                        </div>

                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="text-xs text-rose-600 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={(e) => handleSubmit(e, "DRAFT")}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-300"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={(e) => handleSubmit(e, "SUBMITTED")}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Submit for Approval
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

interface PORowActionsProps {
  po: any;
  suppliers: any[];
  materials: any[];
  uoms: any[];
}

export function PORowActions({ po, suppliers, materials, uoms }: PORowActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit State
  const [supplierId, setSupplierId] = useState(po.supplierId);
  const [expectedDate, setExpectedDate] = useState(
    po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toISOString().split("T")[0] : ""
  );
  const [paymentTerms, setPaymentTerms] = useState(po.paymentTerms || "Net 30 Days");
  const [notes, setNotes] = useState(po.notes || "");
  const [lines, setLines] = useState(
    po.lines.map((l: any) => ({
      materialId: l.materialId,
      quantity: Number(l.quantity),
      unitId: l.unitId || uoms[0]?.id || "",
      unitPrice: Number(l.unitPrice),
      taxRate: Number(l.taxRate || 18),
    }))
  );

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/procurement/orders/${po.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update PO status");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating status");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`/api/procurement/orders/${po.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          expectedDeliveryDate: expectedDate,
          paymentTerms,
          notes,
          lines,
        }),
      });

      if (res.ok) {
        setIsEditOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update PO");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating PO");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete Purchase Order ${po.poNumber}?`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/procurement/orders/${po.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete PO");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting PO");
    } finally {
      setLoading(false);
    }
  };

  const canEdit = po.status === "DRAFT" || po.status === "SUBMITTED" || po.status === "APPROVED";
  const canDelete =
    po.status === "DRAFT" ||
    po.status === "SUBMITTED" ||
    po.status === "CANCELLED" ||
    (po.status === "APPROVED" && po.lines.every((l: any) => Number(l.receivedQuantity) === 0));

  return (
    <div className="flex items-center gap-1.5 justify-end">
      {/* Quick Status Buttons */}
      {po.status === "DRAFT" && (
        <button
          onClick={() => handleUpdateStatus("SUBMITTED")}
          disabled={loading}
          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Send className="w-3 h-3" /> Submit
        </button>
      )}

      {po.status === "SUBMITTED" && (
        <>
          <button
            onClick={() => handleUpdateStatus("APPROVED")}
            disabled={loading}
            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <CheckCircle2 className="w-3 h-3" /> Approve
          </button>
          <button
            onClick={() => handleUpdateStatus("REJECTED")}
            disabled={loading}
            className="px-2 py-1 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <XCircle className="w-3 h-3" /> Reject
          </button>
        </>
      )}

      {po.status === "APPROVED" && po.lines.every((l: any) => Number(l.receivedQuantity) === 0) && (
        <button
          onClick={() => handleUpdateStatus("CANCELLED")}
          disabled={loading}
          className="px-2 py-1 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-[10px] font-medium flex items-center gap-1 cursor-pointer"
        >
          <Ban className="w-3 h-3" /> Cancel
        </button>
      )}

      {/* Edit PO Button */}
      {canEdit && (
        <button
          onClick={() => setIsEditOpen(true)}
          disabled={loading}
          title="Edit Purchase Order"
          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Delete PO Button */}
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={loading}
          title="Delete Purchase Order"
          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-left">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Purchase Order: {po.poNumber}</h3>
                <p className="text-xs text-slate-500">Update supplier, delivery terms or purchase order lines</p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Instructions</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              {/* Lines */}
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-2">
                  Order Line Items
                </span>
                <div className="space-y-3">
                  {lines.map((line: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">Material</label>
                          <select
                            value={line.materialId}
                            onChange={(e) => {
                              const updated = [...lines];
                              updated[idx].materialId = e.target.value;
                              setLines(updated);
                            }}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                          >
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => {
                              const updated = [...lines];
                              updated[idx].quantity = Number(e.target.value);
                              setLines(updated);
                            }}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">Unit Price (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => {
                              const updated = [...lines];
                              updated[idx].unitPrice = Number(e.target.value);
                              setLines(updated);
                            }}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {loading ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
