"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BMRClientActionsProps {
  batch: any;
  availableLots: any[];
  packagingTypes: any[];
  fgWarehouses: any[];
}

export function BMRClientActions({ batch, availableLots, packagingTypes, fgWarehouses }: BMRClientActionsProps) {
  const [consumeOpen, setConsumeOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Material Issue State
  const [selectedMaterialId, setSelectedMaterialId] = useState(batch.formula?.lines?.[0]?.materialId || "");
  const [selectedLotId, setSelectedLotId] = useState("");
  const [quantity, setQuantity] = useState(500);

  // Filter lots that match selected material and are QC released
  const matchingLots = availableLots.filter(
    (l) => l.materialId === selectedMaterialId && (l.status === "AVAILABLE" || l.status === "QC_APPROVED")
  );

  // Complete Batch State
  const [producedQuantity, setProducedQuantity] = useState(Number(batch.plannedQuantity) * 0.98);
  const [packagingTypeId, setPackagingTypeId] = useState(packagingTypes[0]?.id || "");
  const [packageCount, setPackageCount] = useState(40);
  const [warehouseId, setWarehouseId] = useState(fgWarehouses[0]?.id || "");

  const handleConsumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLotId) {
      alert("Please select an approved raw material lot");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/production/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: batch.id,
          materialId: selectedMaterialId,
          lotId: selectedLotId,
          quantity,
          unit: batch.unit,
        }),
      });

      if (res.ok) {
        setConsumeOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to record consumption");
      }
    } catch (err) {
      console.error(err);
      alert("Error issuing raw material");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch("/api/production/complete-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: batch.id,
          productId: batch.productionOrder.productId,
          producedQuantity,
          unit: batch.unit,
          packageCount,
          packagingTypeId,
          warehouseId,
        }),
      });

      if (res.ok) {
        setCompleteOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to complete batch");
      }
    } catch (err) {
      console.error(err);
      alert("Error completing batch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {batch.status === "IN_PROGRESS" && (
        <>
          <Button size="sm" variant="outline" onClick={() => setConsumeOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Issue Raw Material Lot
          </Button>
          <Button size="sm" variant="success" onClick={() => setCompleteOpen(true)} className="gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Complete Batch & Transfer to FG
          </Button>
        </>
      )}

      {/* Consume Modal */}
      {consumeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Issue Raw Material to Batch</h3>
                <p className="text-xs text-slate-500">Only QC-released lots can be issued into manufacturing</p>
              </div>
              <button onClick={() => setConsumeOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConsumeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Required Ingredient *</label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => {
                    setSelectedMaterialId(e.target.value);
                    setSelectedLotId("");
                  }}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  required
                >
                  {batch.formula?.lines?.map((l: any) => (
                    <option key={l.materialId} value={l.materialId}>
                      {l.material.name} (Std: {Number(l.standardQuantity)} {l.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Approved Inventory Lot *
                </label>
                <select
                  value={selectedLotId}
                  onChange={(e) => setSelectedLotId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  required
                >
                  <option value="">-- Choose Released Lot --</option>
                  {matchingLots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.lotNumber} - Available: {Number(lot.currentQuantity) - Number(lot.reservedQuantity)} {lot.unit} ({lot.warehouse.name})
                    </option>
                  ))}
                </select>
                {matchingLots.length === 0 && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">
                    ⚠️ No QC-approved lots found in warehouse for this raw material. Material release required.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Charged Quantity ({batch.unit}) *</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setConsumeOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={loading} disabled={!selectedLotId}>
                  Record Consumption & Deduct Stock
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Batch Modal */}
      {completeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Complete Batch & Generate FG Receipt</h3>
                <p className="text-xs text-slate-500">Record final yield and transfer finished goods into quarantine</p>
              </div>
              <button onClick={() => setCompleteOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Produced Output ({batch.unit}) *</label>
                  <input
                    type="number"
                    value={producedQuantity}
                    onChange={(e) => setProducedQuantity(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold text-emerald-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Package Count (Drums/Bags) *</label>
                  <input
                    type="number"
                    value={packageCount}
                    onChange={(e) => setPackageCount(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Packaging Type *</label>
                <select
                  value={packagingTypeId}
                  onChange={(e) => setPackagingTypeId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  required
                >
                  {packagingTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receiving Finished Goods Warehouse *</label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  required
                >
                  {fgWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCompleteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="success" isLoading={loading}>
                  Generate FG Receipt & Finalize BMR
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
