"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QCActionsProps {
  inspection: any;
}

export function QCActions({ inspection }: QCActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [disposition, setDisposition] = useState<"APPROVED_FOR_RELEASE" | "REJECTED" | "QUARANTINED">("APPROVED_FOR_RELEASE");
  const [reason, setReason] = useState("All chemical and physical parameters comply with standard monograph specification.");
  const [remarks, setRemarks] = useState("Released for production batch charging.");

  const handleAuthorize = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/qc/disposition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspectionId: inspection.id,
          disposition,
          reason,
          remarks,
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to authorize disposition");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting disposition");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant={inspection.status === "APPROVED" ? "outline" : "primary"}
        onClick={() => setIsOpen(true)}
        className="gap-1.5"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        {inspection.status === "APPROVED" ? "View COA / Release Note" : "Authorize Disposition"}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Quality Control Evaluation & Release Disposition
                </h3>
                <p className="text-xs text-slate-500">
                  Inspection: {inspection.inspectionNumber} • Lot: {inspection.lot?.lotNumber || "N/A"}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Recorded Parameters */}
              <div>
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Observed Assay & Laboratory Test Results
                </div>

                <div className="space-y-2">
                  {inspection.results && inspection.results.length > 0 ? (
                    inspection.results.map((r: any) => (
                      <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{r.testName}</div>
                          <div className="text-[11px] text-slate-500">
                            Method: {r.testMethod || "Standard"} • Limit: [{r.expectedMin ?? "-"} to {r.expectedMax ?? "-"}]
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-slate-900">{r.observedValue ?? r.qualitativeResult ?? "N/A"}</div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.isConforming ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                            {r.isConforming ? "CONFORMING" : "NON-CONFORMING"}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      Standard sampling completed. Preliminary physical inspection compliant.
                    </div>
                  )}
                </div>
              </div>

              {/* Disposition Selection */}
              {inspection.status !== "APPROVED" ? (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Release Decision / Disposition Authority *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDisposition("APPROVED_FOR_RELEASE");
                          setReason("All chemical and physical parameters comply with standard monograph specification.");
                          setRemarks("Released for production batch charging.");
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                          disposition === "APPROVED_FOR_RELEASE"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Release Stock
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDisposition("QUARANTINED");
                          setReason("Secondary test verification required before release.");
                          setRemarks("Keep in Quarantine Bay.");
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                          disposition === "QUARANTINED"
                            ? "bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-500"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Quarantine Hold
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDisposition("REJECTED");
                          setReason("Does not meet specification limits.");
                          setRemarks("Return to vendor or authorized disposal.");
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                          disposition === "REJECTED"
                            ? "bg-rose-50 border-rose-500 text-rose-800 ring-1 ring-rose-500"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <XCircle className="w-4 h-4 text-rose-600" />
                        Reject Lot
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Disposition Reason / Monograph Compliance</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Release Remarks & Handling Instructions</label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Material Formally Released for Production
                  </div>
                  <div>Certificate of Analysis (COA): <span className="font-mono font-bold">{inspection.coaNumber || "COA-2026-RELEASED"}</span></div>
                  <div className="text-[11px] text-emerald-700">Stock unlocked and available for production batch consumption.</div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              {inspection.status !== "APPROVED" && (
                <Button onClick={handleAuthorize} isLoading={loading}>
                  Execute Release Disposition
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
