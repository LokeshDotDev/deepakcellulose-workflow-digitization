import React from "react";
import prisma from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { GitBranch, ArrowRight, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WorkflowConfigPage() {
  const workflows = await prisma.workflowDefinition.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      versions: {
        orderBy: { version: "desc" },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Link
            href="/admin"
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to System Administration
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <GitBranch className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Configurable Workflows & Approval State Machines</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Server-enforced state transitions, stage sequences, role-based approval requirements & disposition paths.
          </p>
        </div>

        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> State Machine Enforced
        </span>
      </div>

      {/* Workflow Definitions Cards */}
      <div className="space-y-6">
        {workflows.map((wf) => {
          const activeVersion = wf.versions.find((v) => v.status === "PUBLISHED") || wf.versions[0];
          const stages = (activeVersion?.stages as any[]) || [];
          const transitions = (activeVersion?.transitions as any[]) || [];

          return (
            <div key={wf.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{wf.name}</h2>
                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {wf.code}
                    </span>
                    <Badge variant="success">Version {activeVersion?.version || 1}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{wf.description}</p>
                </div>

                <div className="text-[11px] text-slate-400">
                  Target Entity: <span className="font-semibold text-slate-700">{wf.entityType}</span>
                </div>
              </div>

              {/* Visual Stages Flow */}
              <div>
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Ordered Approval Stages & Department Responsibility
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {stages.map((stg, sIdx) => (
                    <React.Fragment key={stg.code}>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 min-w-44 text-xs">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Stage {sIdx + 1} • {stg.department}
                        </div>
                        <div className="font-bold text-slate-900">{stg.name}</div>
                        <div className="text-[10px] text-indigo-700 font-medium">
                          {stg.allowedRoles ? stg.allowedRoles.join(", ") : "Authorized"}
                        </div>
                      </div>
                      {sIdx < stages.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Transition Validation Rules */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Validated State Transitions (Enforced on Server Mutation)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {transitions.map((t, tIdx) => (
                    <div key={tIdx} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-800">
                          {t.from} → <span className="text-indigo-600 font-bold">{t.to}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Action: {t.action}</div>
                      </div>
                      <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                        Requires: {t.roleRequired || "SUPER_ADMIN"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
