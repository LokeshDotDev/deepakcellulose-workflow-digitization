"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  ShieldCheck,
  AlertTriangle,
  GitBranch,
  Table as TableIcon,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Info,
  X,
  Layers,
  FileText,
  User,
  ShieldAlert,
  Send,
  Flag
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StageExec {
  id: string;
  nodeId: string;
  status: "NOT_STARTED" | "READY" | "IN_PROGRESS" | "AWAITING_QC" | "AWAITING_APPROVAL" | "COMPLETED" | "ON_HOLD" | "REJECTED" | "BLOCKED" | "CANCELLED";
  assignedOperatorId?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  observations?: Record<string, any> | null;
  controlResults?: Record<string, any> | null;
  notes?: string | null;
  rejectionReason?: string | null;
  node: {
    id: string;
    nodeKey: string;
    label: string;
    nodeType: string;
    sequenceOrder: number;
    positionX: number;
    positionY: number;
    description?: string | null;
    responsibleDept: string;
    responsibleRole: string;
    mandatoryQCCheck: boolean;
    isCriticalControlPoint: boolean;
    requiresVerification: boolean;
    equipmentType?: string | null;
    materials: Array<{ materialCode: string; materialName: string; flowType: string }>;
    controlPoints: Array<{
      id: string;
      parameterName: string;
      controlType: string;
      unitOfMeasure?: string | null;
      acceptanceCriteria?: string | null;
      isMandatory: boolean;
    }>;
  };
  deviations?: Array<{
    id: string;
    deviationCode: string;
    title: string;
    description: string;
    severity: string;
    status: string;
  }>;
}

interface BatchProcessClientProps {
  batch: any;
  execution: {
    id: string;
    status: string;
    template: {
      code: string;
      name: string;
      sopReference: string;
      documentTitle: string;
    };
    templateVersion: {
      versionNumber: number;
      nodes: any[];
      edges: any[];
    };
    stageExecutions: StageExec[];
  };
  user: any;
}

export function BatchProcessClient({ batch, execution, user }: BatchProcessClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"DIAGRAM" | "LIST" | "DEVIATIONS">("DIAGRAM");
  const [stageExecutions, setStageExecutions] = useState<StageExec[]>(execution.stageExecutions || []);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.85);

  // Modal / drawer action state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form inputs for current stage
  const [operatorNotes, setOperatorNotes] = useState("");
  const [recordedControls, setRecordedControls] = useState<Record<string, any>>({});
  const [showDeviationModal, setShowDeviationModal] = useState(false);
  const [devTitle, setDevTitle] = useState("");
  const [devDesc, setDevDesc] = useState("");
  const [devSeverity, setDevSeverity] = useState("MINOR");

  const selectedStage = stageExecutions.find((s) => s.id === selectedStageId);

  // Status metrics
  const totalStages = stageExecutions.length;
  const completedStages = stageExecutions.filter((s) => s.status === "COMPLETED").length;
  const inProgressStages = stageExecutions.filter((s) => s.status === "IN_PROGRESS").length;
  const readyStages = stageExecutions.filter((s) => s.status === "READY").length;
  const onHoldStages = stageExecutions.filter((s) => s.status === "ON_HOLD").length;
  const progressPct = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  // Status badge style helper
  const getStageStatusClasses = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "border-emerald-400 bg-emerald-950/80 text-emerald-200 ring-1 ring-emerald-500/40";
      case "IN_PROGRESS":
        return "border-indigo-400 bg-indigo-950/80 text-indigo-100 ring-2 ring-indigo-400/60 animate-pulse";
      case "READY":
        return "border-amber-400 bg-amber-950/70 text-amber-100 ring-1 ring-amber-400/50";
      case "AWAITING_QC":
      case "AWAITING_APPROVAL":
        return "border-purple-400 bg-purple-950/80 text-purple-200 ring-1 ring-purple-400/50";
      case "ON_HOLD":
      case "REJECTED":
        return "border-rose-500 bg-rose-950/80 text-rose-200 ring-2 ring-rose-500/50";
      default:
        return "border-slate-700 bg-slate-900/90 text-slate-400 opacity-75";
    }
  };

  const handleOpenStage = (stageId: string) => {
    setSelectedStageId(stageId);
    setActionError(null);
    setActionSuccess(null);
    const target = stageExecutions.find((s) => s.id === stageId);
    setOperatorNotes(target?.notes || "");
    setRecordedControls((target?.controlResults as any) || {});
  };

  const handleTransition = async (newStatus: string) => {
    if (!selectedStage) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/production/batches/${batch.id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TRANSITION_STAGE",
          stageExecutionId: selectedStage.id,
          newStatus,
          payload: {
            notes: operatorNotes,
            controlResults: recordedControls,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update stage status");

      setActionSuccess(`Stage updated to ${newStatus}.`);
      // Refresh page data
      router.refresh();
      // Update local state
      setStageExecutions((prev) =>
        prev.map((s) => (s.id === selectedStage.id ? { ...s, ...data.stageExecution } : s))
      );
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogDeviation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStage) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/production/batches/${batch.id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LOG_DEVIATION",
          stageExecutionId: selectedStage.id,
          payload: {
            title: devTitle,
            description: devDesc,
            severity: devSeverity,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log deviation");

      setShowDeviationModal(false);
      setActionSuccess("Deviation recorded. Batch/stage placed on hold where required.");
      router.refresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Link
            href={`/production/batches/${batch.id}`}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Batch BMR ({batch.batchNumber})
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 font-mono">
              Batch Process Flow: {batch.batchNumber}
            </h1>
            <Badge status={batch.status} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Template: <strong className="text-slate-800">{execution.template.name}</strong> ({execution.template.code}) • SOP: {execution.template.sopReference} • Rev {execution.templateVersion.versionNumber}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab("DIAGRAM")}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === "DIAGRAM" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" /> Interactive Flowchart
          </button>
          <button
            onClick={() => setActiveTab("LIST")}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === "LIST" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" /> Execution Checklist
          </button>
        </div>
      </div>

      {/* Progress & KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Process Progress</span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{progressPct}%</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase">Completed Stages</span>
          <div className="text-lg font-bold text-emerald-700 mt-0.5">
            {completedStages} / {totalStages}
          </div>
          <span className="text-[10px] text-slate-400">Validated & signed-off</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-indigo-600 uppercase">In Progress</span>
          <div className="text-lg font-bold text-indigo-700 mt-0.5">{inProgressStages} Active</div>
          <span className="text-[10px] text-slate-400">Under operation</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-600 uppercase">Ready To Start</span>
          <div className="text-lg font-bold text-amber-700 mt-0.5">{readyStages} Stages</div>
          <span className="text-[10px] text-slate-400">Dependencies satisfied</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-600 uppercase">Deviations / Holds</span>
          <div className="text-lg font-bold text-rose-700 mt-0.5">{onHoldStages} On Hold</div>
          <span className="text-[10px] text-slate-400">Requires QA review</span>
        </div>
      </div>

      {/* Main Flow View: Interactive Flowchart */}
      {activeTab === "DIAGRAM" && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative h-[700px] flex flex-col">
          {/* Canvas Controls Header */}
          <div className="p-3 bg-slate-900/90 backdrop-blur-xs border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 z-10">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-200">Execution Flow State</span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Completed
                </span>
                <span className="flex items-center gap-1 text-indigo-400">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" /> In Progress
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Ready
                </span>
                <span className="flex items-center gap-1 text-purple-400">
                  <span className="w-2 h-2 rounded-full bg-purple-400" /> Awaiting QC
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-600" /> Not Started
                </span>
              </div>
            </div>

            <div className="flex items-center bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
                className="p-1 hover:bg-slate-700 rounded text-slate-300"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-[10px] font-mono text-slate-300">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
                className="p-1 hover:bg-slate-700 rounded text-slate-300"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(0.85)}
                className="px-2 py-0.5 text-[10px] hover:bg-slate-700 rounded text-slate-300"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Interactive Flow Canvas */}
          <div className="flex-1 w-full h-full relative overflow-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                width: "2200px",
                height: "900px",
                position: "relative",
              }}
            >
              {/* SVG Connectors */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                <defs>
                  <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                  </marker>
                  <marker id="flow-arrow-done" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                  </marker>
                </defs>

                {execution.templateVersion.edges.map((edge: any, idx: number) => {
                  const sourceStage = stageExecutions.find((s) => s.node.nodeKey === edge.sourceNode?.nodeKey);
                  const targetStage = stageExecutions.find((s) => s.node.nodeKey === edge.targetNode?.nodeKey);
                  if (!sourceStage || !targetStage) return null;

                  const sx = sourceStage.node.positionX + 90;
                  const sy = sourceStage.node.positionY + 35;
                  const tx = targetStage.node.positionX + 90;
                  const ty = targetStage.node.positionY + 35;

                  const isSourceDone = sourceStage.status === "COMPLETED";

                  const dx = tx - sx;
                  const dy = ty - sy;
                  const cx1 = sx + dx * 0.5;
                  const cy1 = sy;
                  const cx2 = sx + dx * 0.5;
                  const cy2 = ty;
                  const pathData = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;

                  return (
                    <path
                      key={idx}
                      d={pathData}
                      fill="none"
                      stroke={isSourceDone ? "#10b981" : "#475569"}
                      strokeWidth="2.5"
                      markerEnd={isSourceDone ? "url(#flow-arrow-done)" : "url(#flow-arrow)"}
                    />
                  );
                })}
              </svg>

              {/* Stage Cards */}
              {stageExecutions.map((stage) => {
                const isSelected = selectedStageId === stage.id;
                const statusStyle = getStageStatusClasses(stage.status);

                return (
                  <div
                    key={stage.id}
                    onClick={() => handleOpenStage(stage.id)}
                    style={{
                      position: "absolute",
                      left: `${stage.node.positionX}px`,
                      top: `${stage.node.positionY}px`,
                      width: "180px",
                      zIndex: isSelected ? 10 : 2,
                    }}
                    className={`p-3 rounded-xl border-2 shadow-lg cursor-pointer transition-all hover:scale-105 ${statusStyle} ${
                      isSelected ? "ring-2 ring-white" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span className="font-bold text-slate-200">{stage.node.nodeKey}</span>
                      <span className="font-semibold text-[9px] px-1.5 py-0.2 rounded bg-black/40">
                        {stage.status.replace("_", " ")}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold leading-snug line-clamp-2 text-white">
                      {stage.node.label}
                    </h4>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {stage.node.isCriticalControlPoint && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          CCP
                        </span>
                      )}
                      {stage.node.mandatoryQCCheck && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          QC
                        </span>
                      )}
                      {stage.node.materials.length > 0 && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {stage.node.materials.map((m) => m.materialCode).join(",")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tabular Checklist Alternative */}
      {activeTab === "LIST" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Batch Stage Execution Checklist</h3>
              <p className="text-xs text-slate-500">Accessible step-by-step table view of manufacturing execution</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Seq</th>
                  <th className="px-4 py-3">Stage Node</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Dept & Role</th>
                  <th className="px-4 py-3">Charged Materials</th>
                  <th className="px-4 py-3">Control Points</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stageExecutions
                  .sort((a, b) => a.node.sequenceOrder - b.node.sequenceOrder)
                  .map((stage) => (
                    <tr key={stage.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-medium text-slate-500">{stage.node.sequenceOrder}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-indigo-600 block">{stage.node.nodeKey}</span>
                        <span className="font-semibold text-slate-900">{stage.node.label}</span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600">{stage.node.nodeType}</td>
                      <td className="px-4 py-3">
                        <Badge status={stage.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-800 font-medium">{stage.node.responsibleDept}</span>
                        <span className="text-slate-400 block text-[10px]">{stage.node.responsibleRole}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">
                        {stage.node.materials.length > 0 ? (
                          stage.node.materials.map((m) => m.materialCode).join(", ")
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px]">
                        {stage.node.controlPoints.length > 0 ? (
                          <span className="text-amber-700 font-medium">
                            {stage.node.controlPoints.map((cp) => cp.parameterName).join(", ")}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenStage(stage.id)}
                          className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition-colors"
                        >
                          View / Execute
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stage Execution Modal / Drawer */}
      {selectedStage && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {selectedStage.node.nodeKey}
                  </span>
                  <Badge status={selectedStage.status} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedStage.node.label}</h3>
                <p className="text-xs text-slate-500">{selectedStage.node.description}</p>
              </div>

              <button onClick={() => setSelectedStageId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification alert */}
            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{actionError}</div>
              </div>
            )}
            {actionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <div>{actionSuccess}</div>
              </div>
            )}

            {/* Stage Info Grid */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Responsible Dept</span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedStage.node.responsibleDept}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Designated Role</span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedStage.node.responsibleRole}</p>
              </div>
              {selectedStage.node.equipmentType && (
                <div className="col-span-2">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Assigned Equipment</span>
                  <p className="font-bold text-indigo-700 mt-0.5">{selectedStage.node.equipmentType}</p>
                </div>
              )}
            </div>

            {/* Charged Raw Materials */}
            {selectedStage.node.materials.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Charged Raw Materials</h4>
                <div className="space-y-1">
                  {selectedStage.node.materials.map((m, idx) => (
                    <div key={idx} className="p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-indigo-700">{m.materialCode}</span> — {m.materialName}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-800 font-semibold rounded">
                        {m.flowType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Process Control Points */}
            {selectedStage.node.controlPoints.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Process Control Points & Acceptance Limits
                </h4>
                <div className="space-y-2">
                  {selectedStage.node.controlPoints.map((cp) => {
                    const isMissingSpec = cp.acceptanceCriteria === "Specification Not Configured";
                    return (
                      <div key={cp.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{cp.parameterName}</span>
                          {isMissingSpec ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                              ⚠️ Specification Not Configured
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                              {cp.acceptanceCriteria}
                            </span>
                          )}
                        </div>

                        {/* Input measurement if in progress */}
                        {selectedStage.status === "IN_PROGRESS" && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-slate-500 font-medium">Record Value:</span>
                            <input
                              type="text"
                              placeholder={`Observed value ${cp.unitOfMeasure ? `(${cp.unitOfMeasure})` : ""}`}
                              value={recordedControls[cp.parameterName] || ""}
                              onChange={(e) =>
                                setRecordedControls({ ...recordedControls, [cp.parameterName]: e.target.value })
                              }
                              className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs bg-white flex-1"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Operator Notes / Observations */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                Observations & Operational Remarks
              </label>
              <textarea
                rows={2}
                disabled={selectedStage.status === "COMPLETED"}
                placeholder="Log physical state, color change, observation notes..."
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            {/* Action Buttons based on Stage Status */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowDeviationModal(true)}
                className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Flag className="w-3.5 h-3.5" /> Log Deviation / Hold
              </button>

              <div className="flex items-center gap-2">
                {selectedStage.status === "READY" && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleTransition("IN_PROGRESS")}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Stage Execution
                  </button>
                )}

                {selectedStage.status === "IN_PROGRESS" && (
                  <>
                    {selectedStage.node.mandatoryQCCheck && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleTransition("AWAITING_QC")}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Submit for QC Inspection
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleTransition("COMPLETED")}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Complete Stage
                    </button>
                  </>
                )}

                {(selectedStage.status === "AWAITING_QC" || selectedStage.status === "AWAITING_APPROVAL") && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleTransition("COMPLETED")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Approve & Sign-Off Stage
                  </button>
                )}

                {selectedStage.status === "ON_HOLD" && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleTransition("IN_PROGRESS")}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" /> Release Hold & Resume
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Deviation Modal */}
      {showDeviationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Log Manufacturing Process Deviation</h3>
                <p className="text-xs text-slate-500">Document operational exception or out-of-trend observation</p>
              </div>
              <button onClick={() => setShowDeviationModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogDeviation} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deviation Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Temperature overshoot during cooking phase"
                  value={devTitle}
                  onChange={(e) => setDevTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Severity *</label>
                <select
                  value={devSeverity}
                  onChange={(e) => setDevSeverity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="MINOR">Minor (No direct impact on drug product)</option>
                  <option value="MAJOR">Major (Potential quality impact - Hold Stage)</option>
                  <option value="CRITICAL">Critical (Direct monograph impact - Full Batch Hold)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide complete factual context, observed readings, and immediate actions taken..."
                  value={devDesc}
                  onChange={(e) => setDevDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeviationModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {actionLoading ? "Logging..." : "Submit Deviation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
