"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  GitBranch,
  FileText,
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileCode,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProcessTemplateItem {
  id: string;
  code: string;
  name: string;
  documentTitle: string;
  sopReference: string;
  documentNumber?: string | null;
  category: string;
  departmentCode: string;
  requiresVerification: boolean;
  currentRevision: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  createdBy: { fullName: string; email: string };
  versions: Array<{
    id: string;
    versionNumber: number;
    status: string;
    publishedAt?: string | null;
    _count: { nodes: number; edges: number; executions: number };
  }>;
  _count: { executions: number };
}

interface ProcessTemplatesClientProps {
  initialTemplates: ProcessTemplateItem[];
  userRoles: string[];
}

export function ProcessTemplatesClient({ initialTemplates, userRoles }: ProcessTemplatesClientProps) {
  const router = useRouter();
  const isSuperAdmin = userRoles.includes("SUPER_ADMIN") || userRoles.includes("SYSTEM_ADMIN");

  const [templates, setTemplates] = useState(initialTemplates);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state for creating template
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    documentTitle: "",
    sopReference: "",
    documentNumber: "",
    category: "Batch Manufacturing",
    departmentCode: "QA",
    requiresVerification: true,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filtered = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      t.sopReference.toLowerCase().includes(search.toLowerCase()) ||
      t.documentTitle.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/process-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create template");

      setShowCreateModal(false);
      router.push(`/admin/process-templates/${data.data.template.id}`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code, SOP ref (e.g. 176QA06, HPMC)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg text-xs px-3 py-2 bg-white text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" /> Create Process Template
          </button>
        )}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200">
            <GitBranch className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No process templates matched your search.</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the filter or create a new template.</p>
          </div>
        ) : (
          filtered.map((template) => {
            const activeVer = template.versions[0];
            const nodeCount = activeVer?._count?.nodes || 0;
            const edgeCount = activeVer?._count?.edges || 0;
            const executionCount = template._count?.executions || 0;

            return (
              <div
                key={template.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {template.code}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">Rev {template.currentRevision}</span>
                      </div>
                      <h2 className="text-sm font-bold text-slate-900 mt-1.5">{template.name}</h2>
                      <p className="text-xs text-slate-500 font-medium">{template.documentTitle}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <Badge status={template.status} />
                      {template.requiresVerification && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-amber-500" /> Requires Verification
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Document Metadata Badges */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400">Ref. SOP:</span>
                      <p className="font-mono font-medium text-slate-800">{template.sopReference}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Document No:</span>
                      <p className="font-mono font-medium text-slate-800">{template.documentNumber || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Department:</span>
                      <p className="font-medium text-slate-800">{template.departmentCode}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Category:</span>
                      <p className="font-medium text-slate-800">{template.category}</p>
                    </div>
                  </div>

                  {/* Flow Stats */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800">{nodeCount}</span> Stages
                    </div>
                    <div>•</div>
                    <div>
                      <span className="font-bold text-slate-800">{edgeCount}</span> Directed Paths
                    </div>
                    <div>•</div>
                    <div>
                      <span className="font-bold text-slate-800">{executionCount}</span> Batches Run
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Owner: {template.createdBy?.fullName || "Super Admin"}
                  </span>

                  <Link
                    href={`/admin/process-templates/${template.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Open Process Designer <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Create New Manufacturing Process Template</h3>
                <p className="text-xs text-slate-500">Initialize a version-controlled directed workflow graph</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateTemplate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Template Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PT-HPMC-P"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SOP Reference *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 176QA06"
                    value={formData.sopReference}
                    onChange={(e) => setFormData({ ...formData, sopReference: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HPMC-P Batch Manufacturing Process"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PROCESS FLOWCHART – HPMC-P APPENDIX-A"
                  value={formData.documentTitle}
                  onChange={(e) => setFormData({ ...formData, documentTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document No.</label>
                  <input
                    type="text"
                    placeholder="e.g. 07"
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.departmentCode}
                    onChange={(e) => setFormData({ ...formData, departmentCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  >
                    <option value="QA">QA (Quality Assurance)</option>
                    <option value="QC">QC (Quality Control)</option>
                    <option value="PRODUCTION">Production</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create & Launch Editor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
