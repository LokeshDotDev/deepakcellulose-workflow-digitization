import React from "react";
import prisma from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { History, Shield, Lock, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; q?: string }>;
}) {
  const { action, q } = await searchParams;

  const whereClause: any = {};
  if (action) {
    whereClause.action = action;
  }
  if (q) {
    whereClause.OR = [
      { documentNumber: { contains: q, mode: "insensitive" } },
      { actorName: { contains: q, mode: "insensitive" } },
      { actorEmail: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
    ];
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: whereClause,
    orderBy: { timestamp: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <History className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Immutable Audit Trail & Regulatory Logs</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            21 CFR Part 11 / GMP compliant tamper-evident operational activity log with actor timestamps & change snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            Append-Only Protected
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <form method="GET" className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={q || ""}
              placeholder="Filter by Document No., Actor, or Entity..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 w-full outline-none focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition"
          >
            Filter
          </button>
        </form>

        <div className="text-slate-500 text-[11px]">
          Showing latest {auditLogs.length} immutable events
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Entity & Document No.</th>
                <th className="py-3 px-4">Audit Details / Payload Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                      {formatDate(log.timestamp, true)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.actorName || "System Process"}</div>
                      <div className="text-[11px] text-slate-400">{log.actorEmail || "daemon@deepakcellulose.com"}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-indigo-700">
                        {log.documentNumber || log.entityId.slice(0, 8)}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{log.entityType}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 max-w-md truncate">
                      {log.details ? JSON.stringify(log.details) : "-"}
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
