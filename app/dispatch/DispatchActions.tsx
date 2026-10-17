"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Truck, X, CheckCircle2, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreateCustomerOrderButtonProps {
  customers: any[];
  products: any[];
}

export function CreateCustomerOrderButton({ customers, products }: CreateCustomerOrderButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [customerPoNumber, setCustomerPoNumber] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30 Days");
  const [lines, setLines] = useState([
    {
      productId: products[0]?.id || "",
      orderedQuantity: 2000,
      unit: "KG",
      unitPrice: 480,
      taxRate: 18,
    },
  ]);

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        productId: products[0]?.id || "",
        orderedQuantity: 1000,
        unit: "KG",
        unitPrice: 500,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !customerPoNumber) {
      alert("Please select customer and enter PO reference");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/dispatch/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          customerPoNumber,
          requiredDeliveryDate: requiredDate,
          paymentTerms,
          lines,
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create customer order");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting customer order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
      >
        <ShoppingBag className="w-4 h-4" />
        New Customer Order
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-left">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Sales / Customer Order</h3>
                <p className="text-xs text-slate-500">Record pharma formulation contract for finished goods excipients</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Buyer *</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white text-slate-800"
                    required
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer PO Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PO-CIPLA-2026-908"
                    value={customerPoNumber}
                    onChange={(e) => setCustomerPoNumber(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Required Delivery Date</label>
                  <input
                    type="date"
                    value={requiredDate}
                    onChange={(e) => setRequiredDate(e.target.value)}
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
              </div>

              {/* Order Lines */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Ordered Product Lines
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product
                  </button>
                </div>

                <div className="space-y-3">
                  {lines.map((line, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">Finished Product</label>
                          <select
                            value={line.productId}
                            onChange={(e) => handleLineChange(idx, "productId", e.target.value)}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">Quantity (KG)</label>
                          <input
                            type="number"
                            min="1"
                            value={line.orderedQuantity}
                            onChange={(e) => handleLineChange(idx, "orderedQuantity", Number(e.target.value))}
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
                            onChange={(e) => handleLineChange(idx, "unitPrice", Number(e.target.value))}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                      </div>

                      {lines.length > 1 && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            Remove Line
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {loading ? "Creating Order..." : "Confirm & Save Customer Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

interface DispatchActionsProps {
  customerOrders: any[];
  availableFGLots: any[];
  preselectedOrderId?: string;
}

export function DispatchActions({
  customerOrders,
  availableFGLots,
  preselectedOrderId,
}: DispatchActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Pending customer orders needing dispatch
  const pendingOrders = customerOrders.filter(
    (o) => o.status === "CONFIRMED" || o.status === "PROCESSING" || o.status === "PARTIALLY_DISPATCHED"
  );

  // Form State
  const [customerOrderId, setCustomerOrderId] = useState(preselectedOrderId || pendingOrders[0]?.id || "");
  const [transporterName, setTransporterName] = useState("V-Trans India Logistics Pvt. Ltd.");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [selectedLotId, setSelectedLotId] = useState("");
  const [dispatchQuantity, setDispatchQuantity] = useState(1000);
  const [remarks, setRemarks] = useState("COA and Material Safety Data Sheet (MSDS) attached with driver.");

  const activeOrder = customerOrders.find((o) => o.id === customerOrderId);
  const activeLine = activeOrder?.lines?.[0];

  // Filter lots that match product and are QC released
  const matchingFGLots = availableFGLots.filter(
    (l) => l.productId === activeLine?.productId && (l.status === "AVAILABLE" || l.status === "QC_APPROVED")
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !activeLine || !selectedLotId) {
      alert("Please select customer order and available finished goods lot");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerOrderId: activeOrder.id,
          transporterName,
          vehicleNumber,
          driverName,
          driverPhone,
          lrNumber,
          totalPackages: Math.ceil(dispatchQuantity / 50),
          netWeight: dispatchQuantity,
          grossWeight: dispatchQuantity * 1.05,
          remarks,
          allocations: [
            {
              customerOrderLineId: activeLine.id,
              productId: activeLine.productId,
              finishedGoodsLotId: selectedLotId,
              allocatedQuantity: Number(dispatchQuantity),
              unit: activeLine.unit || "KG",
              unitPrice: Number(activeLine.unitPrice),
            },
          ],
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create dispatch challan");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting dispatch challan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
        <Truck className="w-4 h-4" />
        New Dispatch Challan
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-left">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  Generate Delivery Challan & Allocate Inventory
                </h3>
                <p className="text-xs text-slate-500">Allocate QC-released finished goods lots to confirmed customer orders</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Order Reference *</label>
                  <select
                    value={customerOrderId}
                    onChange={(e) => {
                      setCustomerOrderId(e.target.value);
                      setSelectedLotId("");
                    }}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                    required
                  >
                    <option value="">-- Select Active Order --</option>
                    {pendingOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} ({o.customer.name} - PO: {o.customerPoNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Logistics / Transporter</label>
                  <input
                    type="text"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              {activeOrder && activeLine && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="font-semibold text-slate-800">
                    Order Product: <span className="text-blue-700">{activeLine.product?.name}</span>
                  </div>
                  <div className="text-slate-600">
                    Remaining Unfulfilled: <strong>{Number(activeLine.remainingQuantity)} {activeLine.unit}</strong> • Rate: ₹{Number(activeLine.unitPrice)}/kg
                  </div>
                </div>
              )}

              {/* FG Lot Allocation */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select QC-Approved Finished Goods Lot *
                  </label>
                  <select
                    value={selectedLotId}
                    onChange={(e) => setSelectedLotId(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                    required
                  >
                    <option value="">-- Choose Released Lot --</option>
                    {matchingFGLots.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.lotNumber} (Avail: {Number(l.currentQuantity) - Number(l.reservedQuantity)} {l.unit} - {l.status})
                      </option>
                    ))}
                  </select>
                  {matchingFGLots.length === 0 && activeLine && (
                    <div className="text-[11px] text-amber-600 mt-1">
                      No QC-approved finished goods lots found with available balance for {activeLine.product?.name}.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dispatched Quantity (KG) *</label>
                  <input
                    type="number"
                    min="1"
                    value={dispatchQuantity}
                    onChange={(e) => setDispatchQuantity(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                    required
                  />
                </div>
              </div>

              {/* Vehicle & Driver Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. GJ-06-BT-4411"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 uppercase bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Name & Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. Dharmesh Rathod"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lorry Receipt (LR) No.</label>
                  <input
                    type="text"
                    placeholder="e.g. VT/VAD/99120"
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Phone</label>
                  <input
                    type="text"
                    placeholder="+91 94280 XXXXX"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gate Pass & Dispatch Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedLotId}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {loading ? "Generating Challan..." : "Generate Challan & Reserve Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function ConfirmDispatchButton({ dispatchId }: { dispatchId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    if (
      !confirm(
        "Confirm physical vehicle outbound dispatch? This will deduct finished goods inventory transactionally, issue outbound gate pass clearance, and generate the sales invoice for Accounts."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/dispatch/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatchId }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to confirm dispatch");
      }
    } catch (err) {
      console.error(err);
      alert("Error confirming dispatch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant="success" onClick={handleConfirm} isLoading={loading} className="gap-1.5">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Confirm Exit & Invoice
    </Button>
  );
}
