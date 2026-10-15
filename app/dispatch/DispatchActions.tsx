"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Truck, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DispatchActionsProps {
  customerOrders: any[];
  availableFGLots: any[];
}

export function DispatchActions({ customerOrders, availableFGLots }: DispatchActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Pending customer orders needing dispatch
  const pendingOrders = customerOrders.filter(
    (o) => o.status === "CONFIRMED" || o.status === "PROCESSING" || o.status === "PARTIALLY_DISPATCHED"
  );

  // Form State
  const [customerOrderId, setCustomerOrderId] = useState(pendingOrders[0]?.id || "");
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
              unit: activeLine.unit,
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
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="w-4 h-4" />
        New Dispatch Challan
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-cyan-600" />
                  Generate Outbound Dispatch Challan
                </h3>
                <p className="text-xs text-slate-500">Allocate QC-released excipient lots & assign transporter</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Customer Order *</label>
                <select
                  value={customerOrderId}
                  onChange={(e) => {
                    setCustomerOrderId(e.target.value);
                    setSelectedLotId("");
                  }}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  required
                >
                  {pendingOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} - {o.customer.name} (PO: {o.customerPoNumber})
                    </option>
                  ))}
                </select>
              </div>

              {activeOrder && activeLine && (
                <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200 text-xs space-y-1">
                  <div className="font-semibold text-cyan-900">Order Product Line:</div>
                  <div className="text-cyan-800">
                    Product: {activeLine.product.name} • Ordered: {activeLine.orderedQuantity} {activeLine.unit} • Remaining: {activeLine.remainingQuantity} {activeLine.unit}
                  </div>
                </div>
              )}

              {/* Lot Allocation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Allocate Released Finished Goods Lot *
                </label>
                <select
                  value={selectedLotId}
                  onChange={(e) => setSelectedLotId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  required
                >
                  <option value="">-- Select Released FG Lot --</option>
                  {matchingFGLots.map((lot) => {
                    const avail = Number(lot.currentQuantity) - Number(lot.reservedQuantity);
                    return (
                      <option key={lot.id} value={lot.id}>
                        {lot.lotNumber} - Available: {avail} {lot.unit} (Batch: {lot.receipt?.batch?.batchNumber || "Approved"})
                      </option>
                    );
                  })}
                </select>
                {matchingFGLots.length === 0 && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">
                    ⚠️ No QC-released finished lots available in stock for this product.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity to Dispatch (KG) *</label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={dispatchQuantity}
                    onChange={(e) => setDispatchQuantity(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transporter Name</label>
                  <input
                    type="text"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. GJ-06-BT-4411"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 uppercase"
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
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lorry Receipt (LR) No.</label>
                  <input
                    type="text"
                    placeholder="e.g. VT/VAD/99120"
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Phone</label>
                  <input
                    type="text"
                    placeholder="+91 94280 XXXXX"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Special Handling / Gate Pass Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={loading} disabled={!selectedLotId}>
                  Generate Challan & Reserve Stock
                </Button>
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
    if (!confirm("Confirm physical vehicle dispatch? This will deduct finished goods inventory transactionally and generate a sales invoice for Accounts.")) {
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
