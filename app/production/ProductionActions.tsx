"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Play, X, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductionActionsProps {
  products: any[];
  formulas: any[];
}

export function ProductionActions({ products, formulas }: ProductionActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form State
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [formulaId, setFormulaId] = useState(formulas[0]?.id || "");
  const [plannedQuantity, setPlannedQuantity] = useState(2000);
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [notes, setNotes] = useState("");

  const handleProductChange = (pId: string) => {
    setProductId(pId);
    const matchedFormula = formulas.find((f) => f.productId === pId);
    if (matchedFormula) {
      setFormulaId(matchedFormula.id);
      setPlannedQuantity(Number(matchedFormula.standardBatchSize));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch("/api/production/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          formulaId,
          plannedQuantity,
          unit: "KG",
          priority,
          notes,
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create production order");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting production order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="w-4 h-4" />
        New Production Order
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cog className="w-4 h-4 text-indigo-600" />
                  Schedule Production Order
                </h3>
                <p className="text-xs text-slate-500">Plan batch manufacturing campaign against approved formula</p>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Finished Product *</label>
                <select
                  value={productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) - {p.grade || "Standard"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Approved Formula (BOM) Revision *</label>
                <select
                  value={formulaId}
                  onChange={(e) => setFormulaId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  required
                >
                  {formulas.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.formulaCode} (Rev {f.revisionNumber}) - Std Batch: {Number(f.standardBatchSize)} {f.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Planned Quantity (KG) *</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={plannedQuantity}
                    onChange={(e) => setPlannedQuantity(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent Campaign</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Manufacturing Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Dedicated pharma tableting excipient run"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={loading}>
                  Schedule Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function StartBatchButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStart = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/production/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "START_BATCH",
          productionOrderId: orderId,
        }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to start batch");
      }
    } catch (err) {
      console.error(err);
      alert("Error starting batch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" onClick={handleStart} isLoading={loading} className="gap-1.5">
      <Play className="w-3.5 h-3.5" />
      Start BMR Batch
    </Button>
  );
}
