"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Shield, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GateActionsProps {
  suppliers: any[];
  purchaseOrders: any[];
}

export function GateActions({ suppliers, purchaseOrders }: GateActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form State
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [challanNumber, setChallanNumber] = useState("");
  const [challanDate, setChallanDate] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [declaredMaterials, setDeclaredMaterials] = useState("");
  const [declaredQuantity, setDeclaredQuantity] = useState("");
  const [numberOfPackages, setNumberOfPackages] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [tareWeight, setTareWeight] = useState("");
  const [remarks, setRemarks] = useState("");

  const netWeight = grossWeight && tareWeight ? Math.max(0, Number(grossWeight) - Number(tareWeight)) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          vehicleNumber,
          driverName,
          driverPhone,
          challanNumber,
          challanDate,
          purchaseOrderId: purchaseOrderId || undefined,
          declaredMaterials,
          declaredQuantity: declaredQuantity ? Number(declaredQuantity) : undefined,
          declaredUnit: "KG",
          numberOfPackages: numberOfPackages ? Number(numberOfPackages) : undefined,
          weighbridgeGrossWeight: grossWeight ? Number(grossWeight) : undefined,
          weighbridgeTareWeight: tareWeight ? Number(tareWeight) : undefined,
          remarks,
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to record gate pass");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting gate pass");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="w-4 h-4" />
        Record Vehicle Entry
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Security Gate Entry & Weighbridge Record
                </h3>
                <p className="text-xs text-slate-500">Capture supplier consignment, driver identity & weighment</p>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Referenced PO</label>
                  <select
                    value={purchaseOrderId}
                    onChange={(e) => setPurchaseOrderId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">-- No Direct PO / Unplanned Delivery --</option>
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber} ({po.supplier.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Registration Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. GJ-06-AX-8912"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Name *</label>
                  <input
                    type="text"
                    placeholder="Driver full name"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98251 XXXXX"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Challan / Invoice No. *</label>
                  <input
                    type="text"
                    placeholder="e.g. GACL/DEL/8941"
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Challan Date</label>
                  <input
                    type="date"
                    value={challanDate}
                    onChange={(e) => setChallanDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Declared Materials</label>
                  <input
                    type="text"
                    placeholder="e.g. Caustic Soda Flakes / Wood Pulp"
                    value={declaredMaterials}
                    onChange={(e) => setDeclaredMaterials(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Declared Quantity (KG)</label>
                  <input
                    type="number"
                    placeholder="e.g. 4000"
                    value={declaredQuantity}
                    onChange={(e) => setDeclaredQuantity(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Packages / Bags</label>
                  <input
                    type="number"
                    placeholder="e.g. 160 bags"
                    value={numberOfPackages}
                    onChange={(e) => setNumberOfPackages(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* Weighbridge Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  Weighbridge Electronic Scale Readings
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Gross Weight (KG)</label>
                    <input
                      type="number"
                      placeholder="14250"
                      value={grossWeight}
                      onChange={(e) => setGrossWeight(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Tare (Empty Truck) (KG)</label>
                    <input
                      type="number"
                      placeholder="10230"
                      value={tareWeight}
                      onChange={(e) => setTareWeight(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Calculated Net Weight (KG)</label>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-sm">
                      {netWeight !== null ? `${netWeight} KG` : "Pending readings"}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Security Inspection Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Driver presented invoice & challan; seals intact."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={loading}>
                  Generate Security Gate Pass
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
