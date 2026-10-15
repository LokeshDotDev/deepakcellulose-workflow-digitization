"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WarehouseActionsProps {
  gateEntries: any[];
  warehouses: any[];
  materials: any[];
}

export function WarehouseActions({ gateEntries, warehouses, materials }: WarehouseActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Pending gate entries waiting for warehouse unloading
  const pendingGateEntries = gateEntries.filter((g) => g.status === "RECORDED" || g.status === "SENT_TO_WAREHOUSE");

  // Form State
  const [selectedGateId, setSelectedGateId] = useState(pendingGateEntries[0]?.id || "");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || "");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState([
    {
      materialId: materials[0]?.id || "",
      declaredQuantity: 4000,
      receivedQuantity: 4000,
      unit: "KG",
      supplierBatchNumber: "LOT-SUP-2026",
      damageShortageNotes: "",
    },
  ]);

  const activeGate = gateEntries.find((g) => g.id === selectedGateId);

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        materialId: materials[0]?.id || "",
        declaredQuantity: 1000,
        receivedQuantity: 1000,
        unit: "KG",
        supplierBatchNumber: "",
        damageShortageNotes: "",
      },
    ]);
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGate) {
      alert("Please select an active gate entry");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/warehouse/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateEntryId: activeGate.id,
          purchaseOrderId: activeGate.purchaseOrderId || undefined,
          supplierId: activeGate.supplierId,
          supplierChallanNumber: activeGate.challanNumber,
          challanDate: activeGate.challanDate,
          warehouseId,
          remarks,
          lines,
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create GRN");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting GRN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="w-4 h-4" />
        Create Goods Receipt (GRN)
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-emerald-600" />
                  Generate Goods Receipt Note (GRN)
                </h3>
                <p className="text-xs text-slate-500">Unload consignment into Quarantine & initialize QC testing</p>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Arrived Gate Pass *</label>
                  <select
                    value={selectedGateId}
                    onChange={(e) => setSelectedGateId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    required
                  >
                    {pendingGateEntries.length === 0 ? (
                      <option value="">No trucks waiting in yard</option>
                    ) : (
                      pendingGateEntries.map((ge) => (
                        <option key={ge.id} value={ge.id}>
                          {ge.gatePassNumber} - {ge.vehicleNumber} ({ge.supplier.name})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Receiving Warehouse Store *</label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    required
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeGate && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
                  <div className="font-semibold text-amber-900">Arrived Vehicle Consignment:</div>
                  <div className="text-amber-800">
                    Vehicle: {activeGate.vehicleNumber} • Driver: {activeGate.driverName} • Challan: {activeGate.challanNumber}
                  </div>
                  <div className="text-[11px] text-amber-700">
                    Weighbridge Net: {activeGate.weighbridgeNetWeight ? `${activeGate.weighbridgeNetWeight} KG` : "Manual check"}
                  </div>
                </div>
              )}

              {/* Material Lines */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Unloaded Material Lots</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    + Add Lot Line
                  </button>
                </div>

                <div className="space-y-3">
                  {lines.map((line, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
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
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">Declared Qty (KG)</label>
                          <input
                            type="number"
                            value={line.declaredQuantity}
                            onChange={(e) => handleLineChange(idx, "declaredQuantity", Number(e.target.value))}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">Physically Received (KG)</label>
                          <input
                            type="number"
                            value={line.receivedQuantity}
                            onChange={(e) => handleLineChange(idx, "receivedQuantity", Number(e.target.value))}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">Supplier Batch / Heat No.</label>
                          <input
                            type="text"
                            placeholder="e.g. GACL-26B14"
                            value={line.supplierBatchNumber}
                            onChange={(e) => handleLineChange(idx, "supplierBatchNumber", e.target.value)}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-1">Damage / Shortage Notes</label>
                          <input
                            type="text"
                            placeholder="e.g. 2 bags punctured, repacked in LDPE"
                            value={line.damageShortageNotes}
                            onChange={(e) => handleLineChange(idx, "damageShortageNotes", e.target.value)}
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Unloading Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Unloaded at Bay 1, count verified"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={loading} disabled={!activeGate}>
                  Generate GRN & Quarantine Lots
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
