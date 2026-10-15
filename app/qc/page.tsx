import React from "react";
import prisma from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, ShieldCheck, Microscope, FileText } from "lucide-react";
import { QCActions } from "./QCActions";

export const dynamic = "force-dynamic";

export default async function QCPage() {
  const [inspections, specifications, dispositions] = await Promise.all([
    prisma.qCInspection.findMany({
      orderBy: { inspectionDate: "desc" },
      include: {
        lot: {
          include: { material: true, product: true },
        },
        results: true,
      },
    }),
    prisma.qCSpecification.findMany({
      orderBy: { code: "asc" },
      include: {
        parameters: { orderBy: { sequence: "asc" } },
        material: true,
        product: true,
      },
    }),
    prisma.materialDisposition.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { lot: true },
    }),
  ]);

  const pendingCount = inspections.filter((i) => i.status === "PENDING" || i.status === "IN_TESTING" || i.status === "AWAITING_APPROVAL").length;
  const approvedCount = inspections.filter((i) => i.status === "APPROVED").length;
  const rejectedCount = inspections.filter((i) => i.status === "REJECTED" || i.status === "QUARANTINE_HOLD").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Quality Control & Assurance (QC/QA)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Inspection tasks, chemical assay evaluations, parameter conformance & authorized release notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 flex items-center gap-1.5">
            <Microscope className="w-3.5 h-3.5" />
            QC Gating Active
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Pending Inspection Tasks
          </div>
          <div className="text-xl font-bold text-amber-600 mt-1">{pendingCount} Inspections</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Holding material from production use</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Authorized Released Lots
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{approvedCount} Released</div>
          <div className="text-[11px] text-slate-400 mt-0.5">COA generated and stock unlocked</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Configured Specifications</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{specifications.length} Approved Revisions</div>
          <div className="text-[11px] text-slate-400 mt-0.5">IP/BP/USP & internal monographs</div>
        </div>
      </div>

      {/* Inspection Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">QC Inspection Queue & Release Workbench</h2>
            <p className="text-xs text-slate-500">Unreleased lots are strictly quarantined until formal release</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">GMP Compliant Testing</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Inspection No.</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Target Material / Product</th>
                <th className="py-3 px-4">Lot Number</th>
                <th className="py-3 px-4">Inspection Date</th>
                <th className="py-3 px-4">COA / MRN Ref</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {inspections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No inspection tasks generated yet.
                  </td>
                </tr>
              ) : (
                inspections.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {i.inspectionNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {i.stage.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {i.lot?.material?.name || i.lot?.product?.name || "Target Sample"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {i.lot?.lotNumber || "-"}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDate(i.inspectionDate)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {i.coaNumber || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={i.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <QCActions inspection={JSON.parse(JSON.stringify(i))} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QC Specifications Directory */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Approved Quality Specifications & Limits</h2>
            <p className="text-xs text-slate-500">Configured numerical limits and qualitative standards</p>
          </div>
          <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Version Controlled
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {specifications.map((spec) => (
            <div key={spec.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{spec.code} (Rev {spec.revisionNumber})</div>
                  <div className="text-[11px] text-slate-500">{spec.name}</div>
                </div>
                <Badge variant="success">APPROVED</Badge>
              </div>

              <div className="divide-y divide-slate-200/60 bg-white rounded-lg p-2.5 border border-slate-200/80">
                {spec.parameters.map((p) => (
                  <div key={p.id} className="py-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">{p.parameterName}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({p.testMethod || "Method"})</span>
                    </div>
                    <div className="font-mono text-slate-700">
                      {p.minLimit !== null && p.maxLimit !== null
                        ? `[${Number(p.minLimit)} - ${Number(p.maxLimit)}] ${p.unit || ""}`
                        : p.qualitativeCriteria || "Conforming"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
