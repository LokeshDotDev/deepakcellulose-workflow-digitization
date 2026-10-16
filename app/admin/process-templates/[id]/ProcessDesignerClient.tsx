"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  GitBranch,
  Layers,
  Plus,
  Trash2,
  Move,
  Settings,
  Eye,
  FileCheck,
  Archive,
  RefreshCw,
  Table as TableIcon,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Info,
  X,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { validateProcessGraph, GraphValidationResult } from "@/server/services/process-workflow.service";

interface NodeItem {
  id?: string;
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
  verificationNotes?: string | null;
  equipmentType?: string | null;
  materials?: Array<{
    id?: string;
    materialCode: string;
    materialName: string;
    materialId?: string | null;
    flowType: string;
  }>;
  controlPoints?: Array<{
    id?: string;
    parameterName: string;
    controlType: string;
    unitOfMeasure?: string | null;
    acceptanceCriteria?: string | null;
    inspectorRole?: string | null;
    approvalRole?: string | null;
    isMandatory: boolean;
    requiresVerification: boolean;
  }>;
}

interface EdgeItem {
  id?: string;
  sourceNodeKey: string;
  targetNodeKey: string;
  edgeType: string;
  label?: string | null;
  requiresVerification: boolean;
  verificationNotes?: string | null;
}

interface ProcessDesignerClientProps {
  template: any;
  initialVersion: any;
  masterMaterials: Array<{ id: string; code: string; name: string }>;
  userRoles: string[];
}

export function ProcessDesignerClient({
  template,
  initialVersion,
  masterMaterials,
  userRoles,
}: ProcessDesignerClientProps) {
  const router = useRouter();
  const isSuperAdmin = userRoles.includes("SUPER_ADMIN") || userRoles.includes("SYSTEM_ADMIN");

  const [activeTab, setActiveTab] = useState<"GRAPH" | "TABLE" | "VALIDATION">("GRAPH");
  const [version, setVersion] = useState(initialVersion);
  const isDraft = version?.status === "DRAFT";

  // Graph state
  const [nodes, setNodes] = useState<NodeItem[]>(
    initialVersion?.nodes?.map((n: any) => ({
      ...n,
      materials: n.materials || [],
      controlPoints: n.controlPoints || [],
    })) || []
  );

  const [edges, setEdges] = useState<EdgeItem[]>(
    initialVersion?.edges?.map((e: any) => ({
      sourceNodeKey: e.sourceNode?.nodeKey || e.sourceNodeKey,
      targetNodeKey: e.targetNode?.nodeKey || e.targetNodeKey,
      edgeType: e.edgeType || "DEFAULT",
      label: e.label,
      requiresVerification: Boolean(e.requiresVerification),
      verificationNotes: e.verificationNotes,
    })) || []
  );

  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(nodes[0]?.nodeKey || null);
  const selectedNode = nodes.find((n) => n.nodeKey === selectedNodeKey);

  // Canvas zoom & pan
  const [zoom, setZoom] = useState(0.85);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  // Validation
  const [validation, setValidation] = useState<GraphValidationResult>(() =>
    validateProcessGraph(nodes as any, edges as any)
  );

  useEffect(() => {
    setValidation(validateProcessGraph(nodes as any, edges as any));
  }, [nodes, edges]);

  // Actions state
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishChangeReason, setPublishChangeReason] = useState("");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dragging node on canvas
  const [draggingNodeKey, setDraggingNodeKey] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDownNode = (e: React.MouseEvent, nodeKey: string) => {
    e.stopPropagation();
    if (!isDraft) {
      setSelectedNodeKey(nodeKey);
      return;
    }

    setSelectedNodeKey(nodeKey);
    setDraggingNodeKey(nodeKey);
    const targetNode = nodes.find((n) => n.nodeKey === nodeKey);
    if (targetNode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / zoom;
      const clickY = (e.clientY - rect.top) / zoom;
      setDragOffset({
        x: clickX - targetNode.positionX,
        y: clickY - targetNode.positionY,
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeKey || !canvasRef.current || !isDraft) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currX = (e.clientX - rect.left) / zoom;
    const currY = (e.clientY - rect.top) / zoom;

    const newX = Math.max(10, Math.round(currX - dragOffset.x));
    const newY = Math.max(10, Math.round(currY - dragOffset.y));

    setNodes((prev) =>
      prev.map((n) => (n.nodeKey === draggingNodeKey ? { ...n, positionX: newX, positionY: newY } : n))
    );
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeKey(null);
  };

  // Node property update
  const handleUpdateSelectedNode = (field: string, value: any) => {
    if (!selectedNodeKey || !isDraft) return;
    setNodes((prev) =>
      prev.map((n) => (n.nodeKey === selectedNodeKey ? { ...n, [field]: value } : n))
    );
  };

  // Add new stage node
  const handleAddNode = () => {
    if (!isDraft) return;
    const nextNum = nodes.length + 1;
    const newKey = `NODE-${nextNum < 10 ? `0${nextNum}` : nextNum}`;
    const newNode: NodeItem = {
      nodeKey: newKey,
      label: `New Stage ${nextNum}`,
      nodeType: "MANUFACTURING_OPERATION",
      sequenceOrder: nextNum,
      positionX: 100 + (nextNum % 5) * 200,
      positionY: 100 + Math.floor(nextNum / 5) * 120,
      description: "Configurable process stage definition.",
      responsibleDept: "PRODUCTION",
      responsibleRole: "OPERATOR",
      mandatoryQCCheck: false,
      isCriticalControlPoint: false,
      requiresVerification: true,
      verificationNotes: "Newly added node. Needs SOP verification.",
      materials: [],
      controlPoints: [],
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeKey(newKey);
  };

  // Delete stage node
  const handleDeleteNode = (key: string) => {
    if (!isDraft) return;
    if (confirm(`Are you sure you want to delete stage '${key}'?`)) {
      setNodes((prev) => prev.filter((n) => n.nodeKey !== key));
      setEdges((prev) => prev.filter((e) => e.sourceNodeKey !== key && e.targetNodeKey !== key));
      if (selectedNodeKey === key) setSelectedNodeKey(null);
    }
  };

  // Edge connection
  const handleNodeClickForConnect = (nodeKey: string) => {
    if (!isConnecting) {
      setIsConnecting(nodeKey);
    } else {
      if (isConnecting !== nodeKey) {
        // Create edge
        const existing = edges.find(
          (e) => e.sourceNodeKey === isConnecting && e.targetNodeKey === nodeKey
        );
        if (!existing) {
          setEdges((prev) => [
            ...prev,
            {
              sourceNodeKey: isConnecting,
              targetNodeKey: nodeKey,
              edgeType: "DEFAULT",
              requiresVerification: false,
            },
          ]);
        }
      }
      setIsConnecting(null);
    }
  };

  // Delete edge
  const handleDeleteEdge = (source: string, target: string) => {
    if (!isDraft) return;
    setEdges((prev) => prev.filter((e) => !(e.sourceNodeKey === source && e.targetNodeKey === target)));
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!version || !isDraft) return;
    setSaving(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/process-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: version.id,
          nodes,
          edges,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save draft");

      setActionMessage({ type: "success", text: "Draft process graph saved successfully." });
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Publish Version
  const handlePublish = async () => {
    if (!version) return;
    setPublishing(true);
    setActionMessage(null);

    try {
      // First save current nodes
      await fetch(`/api/admin/process-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: version.id,
          nodes,
          edges,
          changeReason: publishChangeReason,
        }),
      });

      // Call publish
      const res = await fetch(`/api/admin/process-templates/${template.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: version.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish process template");

      setShowPublishModal(false);
      setActionMessage({
        type: "success",
        text: `Process Template Revision ${version.versionNumber} successfully published!`,
      });
      router.refresh();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setPublishing(false);
    }
  };

  // Helper for Node Category Colors
  const getNodeColor = (type: string) => {
    switch (type) {
      case "MATERIAL_RECEIPT":
      case "STORAGE":
        return "border-emerald-300 bg-emerald-50/70 text-emerald-900";
      case "QUALITY_INSPECTION":
        return "border-purple-300 bg-purple-50/70 text-purple-900";
      case "PROCESS_CONTROL":
        return "border-sky-300 bg-sky-50/70 text-sky-900";
      case "PREPARATION":
        return "border-amber-300 bg-amber-50/70 text-amber-900";
      case "WASTE_BYPRODUCT":
        return "border-rose-300 bg-rose-50/70 text-rose-900";
      case "PACKAGING":
      case "FINISHED_GOODS":
      case "HANDOVER":
        return "border-indigo-300 bg-indigo-50/70 text-indigo-900";
      default:
        return "border-slate-300 bg-white text-slate-900";
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Link
            href="/admin/process-templates"
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Process Templates
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 font-mono">
              {template.code}: {template.name}
            </h1>
            <Badge status={version?.status || template.status} />
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
              Revision {version?.versionNumber || template.currentRevision}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            SOP Ref: <strong className="text-slate-700">{template.sopReference}</strong> • Title:{" "}
            {template.documentTitle}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab("GRAPH")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === "GRAPH" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" /> Visual Graph
            </button>
            <button
              onClick={() => setActiveTab("TABLE")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === "TABLE" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" /> Stage Matrix
            </button>
            <button
              onClick={() => setActiveTab("VALIDATION")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === "VALIDATION" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" /> Validation ({validation.errors.length}E / {validation.warnings.length}W)
            </button>
          </div>

          {isDraft && isSuperAdmin && (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Save className="w-4 h-4 text-slate-500" />
                {saving ? "Saving..." : "Save Draft"}
              </button>

              <button
                onClick={() => setShowPublishModal(true)}
                disabled={!validation.canPublish}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> Publish Revision
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            {actionMessage.text}
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Provenance & SOP Verification Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-amber-900">
            Document Provenance & GMP Traceability Notice (Ref. SOP: {template.sopReference})
          </p>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            This directed workflow graph was initialized from <em>PROCESS FLOWCHART – HPMC-P APPENDIX-A</em>. Chemical setpoints, temperatures, durations, and acceptance limits require formal sign-off by authorized company personnel before running production batches.
          </p>
        </div>
      </div>

      {/* Main Content Area based on Active Tab */}
      {activeTab === "GRAPH" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* Canvas Viewport (3 Columns) */}
          <div className="lg:col-span-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden flex flex-col relative h-[680px]">
            {/* Canvas Toolbar */}
            <div className="p-3 bg-slate-800/80 backdrop-blur-xs border-b border-slate-700/60 flex items-center justify-between text-xs text-slate-300 z-10">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">Interactive Directed Graph</span>
                <span className="text-[11px] text-slate-400">({nodes.length} Stages, {edges.length} Connections)</span>
                {isConnecting && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] animate-pulse">
                    Click target node to connect from {isConnecting}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isDraft && (
                  <button
                    onClick={handleAddNode}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Stage
                  </button>
                )}

                <div className="flex items-center bg-slate-700 rounded-lg p-0.5">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
                    className="p-1 hover:bg-slate-600 rounded text-slate-300"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-[10px] font-mono text-slate-300">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
                    className="p-1 hover:bg-slate-600 rounded text-slate-300"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoom(0.85)}
                    className="px-2 py-0.5 text-[10px] hover:bg-slate-600 rounded text-slate-300"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas Surface with Grid and SVG Connectors */}
            <div
              ref={canvasRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className="flex-1 w-full h-full relative overflow-auto cursor-grab active:cursor-grabbing bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px]"
              style={{ minHeight: "600px" }}
            >
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                  width: "2200px",
                  height: "900px",
                  position: "relative",
                }}
              >
                {/* SVG Connections Layer */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 1 }}
                >
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#818cf8" />
                    </marker>
                    <marker
                      id="arrow-byproduct"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
                    </marker>
                  </defs>

                  {edges.map((edge, idx) => {
                    const sourceNode = nodes.find((n) => n.nodeKey === edge.sourceNodeKey);
                    const targetNode = nodes.find((n) => n.nodeKey === edge.targetNodeKey);
                    if (!sourceNode || !targetNode) return null;

                    const sx = sourceNode.positionX + 90;
                    const sy = sourceNode.positionY + 35;
                    const tx = targetNode.positionX + 90;
                    const ty = targetNode.positionY + 35;

                    const isByproduct = edge.edgeType === "BYPRODUCT";
                    const isVerification = edge.requiresVerification;

                    // Smooth Bezier Curve
                    const dx = tx - sx;
                    const dy = ty - sy;
                    const cx1 = sx + dx * 0.5;
                    const cy1 = sy;
                    const cx2 = sx + dx * 0.5;
                    const cy2 = ty;
                    const pathData = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;

                    return (
                      <g key={`${edge.sourceNodeKey}-${edge.targetNodeKey}-${idx}`}>
                        <path
                          d={pathData}
                          fill="none"
                          stroke={isByproduct ? "#f43f5e" : isVerification ? "#f59e0b" : "#6366f1"}
                          strokeWidth="2.5"
                          strokeDasharray={isVerification ? "5,5" : "none"}
                          markerEnd={isByproduct ? "url(#arrow-byproduct)" : "url(#arrow)"}
                        />
                        {edge.label && (
                          <text
                            x={(sx + tx) / 2}
                            y={(sy + ty) / 2 - 8}
                            fill="#cbd5e1"
                            fontSize="10"
                            textAnchor="middle"
                            className="font-mono bg-slate-900"
                          >
                            {edge.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Nodes Layer */}
                {nodes.map((node) => {
                  const isSelected = selectedNodeKey === node.nodeKey;
                  const isConnectingSource = isConnecting === node.nodeKey;

                  return (
                    <div
                      key={node.nodeKey}
                      onMouseDown={(e) => handleMouseDownNode(e, node.nodeKey)}
                      onClick={() => {
                        if (isConnecting) handleNodeClickForConnect(node.nodeKey);
                      }}
                      style={{
                        position: "absolute",
                        left: `${node.positionX}px`,
                        top: `${node.positionY}px`,
                        width: "180px",
                        zIndex: isSelected ? 10 : 2,
                      }}
                      className={`select-none p-3 rounded-xl border-2 shadow-lg transition-shadow cursor-pointer ${
                        isSelected
                          ? "border-indigo-400 bg-slate-800 text-white ring-2 ring-indigo-400/50"
                          : isConnectingSource
                          ? "border-amber-400 bg-slate-800 text-amber-200 animate-pulse"
                          : "border-slate-700 bg-slate-800/95 hover:border-slate-500 text-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span className="font-bold text-indigo-400">{node.nodeKey}</span>
                        <span>Seq #{node.sequenceOrder}</span>
                      </div>

                      <h4 className="text-xs font-bold leading-snug line-clamp-2 text-slate-100">
                        {node.label}
                      </h4>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {node.isCriticalControlPoint && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            CCP
                          </span>
                        )}
                        {node.mandatoryQCCheck && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            QC
                          </span>
                        )}
                        {node.requiresVerification && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            VERIF
                          </span>
                        )}
                        {node.materials && node.materials.length > 0 && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            {node.materials.map((m) => m.materialCode).join(",")}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate">{node.responsibleDept}</span>
                        {isDraft && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNodeClickForConnect(node.nodeKey);
                            }}
                            className="text-indigo-400 hover:text-indigo-200"
                            title="Connect to another node"
                          >
                            <GitBranch className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Stage Properties Inspector (1 Column) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col h-[680px] overflow-y-auto">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {selectedNode.nodeKey}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">Stage Properties</h3>
                  </div>
                  {isDraft && (
                    <button
                      onClick={() => handleDeleteNode(selectedNode.nodeKey)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded"
                      title="Delete Stage"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Form fields */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Stage Label / Name</label>
                    <input
                      type="text"
                      disabled={!isDraft}
                      value={selectedNode.label}
                      onChange={(e) => handleUpdateSelectedNode("label", e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Stage Type</label>
                      <select
                        disabled={!isDraft}
                        value={selectedNode.nodeType}
                        onChange={(e) => handleUpdateSelectedNode("nodeType", e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      >
                        <option value="MATERIAL_RECEIPT">Material Receipt</option>
                        <option value="STORAGE">Storage</option>
                        <option value="PREPARATION">Preparation</option>
                        <option value="MANUFACTURING_OPERATION">Manufacturing</option>
                        <option value="PROCESS_CONTROL">Process Control</option>
                        <option value="QUALITY_INSPECTION">Quality Inspection</option>
                        <option value="MATERIAL_TRANSFER">Material Transfer</option>
                        <option value="WASTE_BYPRODUCT">Waste / Byproduct</option>
                        <option value="PACKAGING">Packaging</option>
                        <option value="FINISHED_GOODS">Finished Goods</option>
                        <option value="HANDOVER">Handover</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Sequence</label>
                      <input
                        type="number"
                        disabled={!isDraft}
                        value={selectedNode.sequenceOrder}
                        onChange={(e) => handleUpdateSelectedNode("sequenceOrder", parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Responsible Dept</label>
                      <select
                        disabled={!isDraft}
                        value={selectedNode.responsibleDept}
                        onChange={(e) => handleUpdateSelectedNode("responsibleDept", e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      >
                        <option value="PRODUCTION">Production</option>
                        <option value="QC">QC</option>
                        <option value="QA">QA</option>
                        <option value="WAREHOUSE">Warehouse</option>
                        <option value="GATE">Gate</option>
                        <option value="FINISHED_GOODS">Finished Goods</option>
                        <option value="DISPATCH">Dispatch</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Responsible Role</label>
                      <input
                        type="text"
                        disabled={!isDraft}
                        value={selectedNode.responsibleRole}
                        onChange={(e) => handleUpdateSelectedNode("responsibleRole", e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Stage Description</label>
                    <textarea
                      rows={2}
                      disabled={!isDraft}
                      value={selectedNode.description || ""}
                      onChange={(e) => handleUpdateSelectedNode("description", e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isDraft}
                        checked={selectedNode.isCriticalControlPoint}
                        onChange={(e) => handleUpdateSelectedNode("isCriticalControlPoint", e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-semibold text-slate-800">Critical Control Point (CCP)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isDraft}
                        checked={selectedNode.mandatoryQCCheck}
                        onChange={(e) => handleUpdateSelectedNode("mandatoryQCCheck", e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="font-semibold text-slate-800">Mandatory QC / QA Sign-off</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isDraft}
                        checked={selectedNode.requiresVerification}
                        onChange={(e) => handleUpdateSelectedNode("requiresVerification", e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="font-semibold text-amber-800">Requires Document Verification</span>
                    </label>
                  </div>

                  {/* Raw Materials Associated */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-700 block mb-1">Raw Material References</span>
                    {selectedNode.materials && selectedNode.materials.length > 0 ? (
                      <div className="space-y-1">
                        {selectedNode.materials.map((m, idx) => (
                          <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
                            <span className="font-mono font-bold text-indigo-600">{m.materialCode}</span> — {m.materialName}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No direct raw material charged at this step.</p>
                    )}
                  </div>

                  {/* Process Control Points */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-700 block mb-1">Process Control Points</span>
                    {selectedNode.controlPoints && selectedNode.controlPoints.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedNode.controlPoints.map((cp, idx) => (
                          <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
                            <div className="font-semibold text-slate-800">{cp.parameterName}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>Role: {cp.inspectorRole}</span>
                              {cp.unitOfMeasure && <span>• Unit: {cp.unitOfMeasure}</span>}
                            </div>
                            <div className="mt-1">
                              {cp.acceptanceCriteria === "Specification Not Configured" ? (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                  ⚠️ Specification Not Configured
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-600">{cp.acceptanceCriteria}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No control points configured.</p>
                    )}
                  </div>

                  {/* Incoming & Outgoing Connections */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-700 block mb-1">Outgoing Directed Paths</span>
                    {edges.filter((e) => e.sourceNodeKey === selectedNode.nodeKey).length > 0 ? (
                      <div className="space-y-1">
                        {edges
                          .filter((e) => e.sourceNodeKey === selectedNode.nodeKey)
                          .map((e, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200 rounded text-[11px]"
                            >
                              <span>
                                → <strong className="font-mono text-indigo-600">{e.targetNodeKey}</strong>{" "}
                                {e.label && `(${e.label})`}
                              </span>
                              {isDraft && (
                                <button
                                  onClick={() => handleDeleteEdge(e.sourceNodeKey, e.targetNodeKey)}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No outgoing connections (Terminating node).</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 my-auto text-slate-400">
                <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">Select a stage node on the canvas to inspect and edit its properties.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accessible Table / Matrix View */}
      {activeTab === "TABLE" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Process Stage Matrix & Directed Execution Order</h3>
              <p className="text-xs text-slate-500">Accessible tabular alternative to visual directed graph</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{nodes.length} Stages Documented</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Seq</th>
                  <th className="px-4 py-3">Node Key</th>
                  <th className="px-4 py-3">Stage Label / Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Dept / Role</th>
                  <th className="px-4 py-3">Prerequisites (In)</th>
                  <th className="px-4 py-3">Next Stages (Out)</th>
                  <th className="px-4 py-3">Raw Materials</th>
                  <th className="px-4 py-3">Control Points</th>
                  <th className="px-4 py-3">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nodes
                  .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                  .map((node) => {
                    const incoming = edges.filter((e) => e.targetNodeKey === node.nodeKey);
                    const outgoing = edges.filter((e) => e.sourceNodeKey === node.nodeKey);

                    return (
                      <tr key={node.nodeKey} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-medium text-slate-500">{node.sequenceOrder}</td>
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600">{node.nodeKey}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{node.label}</td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {node.nodeType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-700 font-medium">{node.responsibleDept}</span>
                          <span className="text-slate-400 block text-[10px]">{node.responsibleRole}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          {incoming.length > 0 ? (
                            incoming.map((e) => e.sourceNodeKey).join(", ")
                          ) : (
                            <span className="text-emerald-600 font-sans text-[10px] font-bold">START NODE</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          {outgoing.length > 0 ? (
                            outgoing.map((e) => `${e.targetNodeKey}${e.label ? ` (${e.label})` : ""}`).join(", ")
                          ) : (
                            <span className="text-slate-400 font-sans text-[10px]">FINAL STAGE</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[11px]">
                          {node.materials && node.materials.length > 0 ? (
                            node.materials.map((m) => m.materialCode).join(", ")
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[11px]">
                          {node.controlPoints && node.controlPoints.length > 0 ? (
                            <span className="text-amber-700 font-medium">
                              {node.controlPoints.map((cp) => cp.parameterName).join(", ")}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {node.requiresVerification ? (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              Verification Req.
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              Verified
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Validation Panel */}
      {activeTab === "VALIDATION" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Process Graph Validation & Audit Review</h3>
              <p className="text-xs text-slate-500">Automated structural, reachability, and critical control point checks</p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  validation.isValid
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {validation.isValid ? "✓ Structure Valid" : "✕ Structural Errors"}
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  validation.canPublish
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {validation.canPublish ? "Ready for Publication" : "Publication Blocked"}
              </span>
            </div>
          </div>

          {/* Validation Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="text-xs text-slate-500 uppercase font-semibold">Total Nodes</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{validation.stats.nodeCount}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="text-xs text-slate-500 uppercase font-semibold">Directed Edges</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{validation.stats.edgeCount}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="text-xs text-slate-500 uppercase font-semibold">Critical Controls</span>
              <div className="text-xl font-bold text-rose-600 mt-0.5">{validation.stats.criticalControlPoints}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="text-xs text-slate-500 uppercase font-semibold">Pending Verification</span>
              <div className="text-xl font-bold text-amber-600 mt-0.5">{validation.unconfirmedCount}</div>
            </div>
          </div>

          {/* Errors List */}
          {validation.errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600" /> Critical Validation Errors (Blocking Publication)
              </h4>
              <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings List */}
          {validation.warnings.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Warnings & SOP Confirmations
              </h4>
              <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
                {validation.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Publish Manufacturing Process Revision</h3>
                <p className="text-xs text-slate-500">Promote draft to active production template</p>
              </div>
              <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p>
                <strong>Template:</strong> {template.code} — Revision {version?.versionNumber}
              </p>
              <p>
                <strong>Nodes:</strong> {nodes.length} Stages • <strong>Edges:</strong> {edges.length} Directed Paths
              </p>
              <p className="text-amber-800 text-[11px]">
                Publishing creates an immutable version snapshot. Running batches will remain tied to their originally instantiated revisions.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Revision Change Note / Approval Reason *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Initial verified baseline from SOP: 176QA06 Appendix-A flowchart."
                value={publishChangeReason}
                onChange={(e) => setPublishChangeReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={handlePublish}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {publishing ? "Publishing..." : "Confirm & Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
