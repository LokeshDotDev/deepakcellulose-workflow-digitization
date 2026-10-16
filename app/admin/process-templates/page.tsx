import React from "react";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ProcessTemplatesClient } from "./ProcessTemplatesClient";
import { GitBranch, Shield, Layers, FileCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProcessTemplatesPage() {
  const user = await getSession();

  const templates = await prisma.processTemplate.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, fullName: true, email: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          _count: {
            select: { nodes: true, edges: true, executions: true },
          },
        },
      },
      _count: {
        select: { executions: true },
      },
    },
  });

  const totalTemplates = templates.length;
  const publishedCount = templates.filter((t) => t.status === "PUBLISHED").length;
  const draftCount = templates.filter((t) => t.status === "DRAFT").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <GitBranch className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Configurable Process Templates</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standard operating procedure (SOP) process graphs, branching logic, control points, and version change control.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            Total Process Templates
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{totalTemplates} Workflows</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Managed manufacturing templates</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
            Published & Active
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{publishedCount} Workflows</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Approved for production batch run</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            Drafts in Verification
          </div>
          <div className="text-xl font-bold text-amber-600 mt-1">{draftCount} In Review</div>
          <div className="text-[11px] text-slate-400 mt-0.5">SOP flowchart verification pending</div>
        </div>
      </div>

      {/* Client List & Creation */}
      <ProcessTemplatesClient
        initialTemplates={JSON.parse(JSON.stringify(templates))}
        userRoles={user?.roles || []}
      />
    </div>
  );
}
