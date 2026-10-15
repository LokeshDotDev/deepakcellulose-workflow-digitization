import React from "react";
import prisma from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Sliders, Plus, Eye, History, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { FormBuilderClient } from "./FormBuilderClient";

export const dynamic = "force-dynamic";

export default async function DynamicFormsPage() {
  const formDefinitions = await prisma.formDefinition.findMany({
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
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Sliders className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Dynamic Form & Document Schema Builder</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure custom fields, validation rules, section layouts & versioned publishing without code modification.
          </p>
        </div>

        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Versioned JSON Engine
        </span>
      </div>

      {/* Interactive Form Builder Component */}
      <FormBuilderClient existingForms={formDefinitions} />

      {/* Existing Configured Forms Register */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Configured Form Definitions</h2>
            <p className="text-xs text-slate-500">Historical versions retained for existing transactional documents</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">Schema Version History</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {formDefinitions.map((form) => {
            const activeVersion = form.versions.find((v) => v.status === "PUBLISHED") || form.versions[0];
            const schema = activeVersion?.schema as any;
            const sectionsCount = schema?.sections?.length || 0;

            return (
              <div key={form.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{form.name}</span>
                    <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      {form.code}
                    </span>
                    <Badge variant="success">Version {activeVersion?.version || 1}</Badge>
                  </div>
                  <div className="text-slate-500">{form.description || "Custom operational form schema"}</div>
                  <div className="text-[11px] text-slate-400">
                    Entity: <span className="font-semibold text-slate-700">{form.entityType}</span> • Sections: {sectionsCount} • Published: {formatDate(activeVersion?.publishedAt)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    {form.versions.length} revision{form.versions.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
