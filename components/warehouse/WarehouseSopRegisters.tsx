"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  ClipboardCheck,
  CheckCircle2,
  Plus,
  Search,
  Calendar,
  X,
  Truck,
  Building,
  Package,
  ShieldCheck,
  Printer,
  RefreshCw,
  Eye,
  BadgeAlert,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface WarehouseSopRegistersProps {
  initialChecklists?: any[];
  initialRmInward?: any[];
  initialGrns?: any[];
  currentUser?: {
    fullName: string;
    role: string;
    department?: string;
  };
  defaultTab?: "checklist" | "inward" | "grn";
}

export function WarehouseSopRegisters({
  initialChecklists = [],
  initialRmInward = [],
  initialGrns = [],
  currentUser,
  defaultTab = "checklist",
}: WarehouseSopRegistersProps) {
  const [activeTab, setActiveTab] = useState<"checklist" | "inward" | "grn">(defaultTab);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedChecklists = Array.isArray(initialChecklists)
    ? initialChecklists
    : (initialChecklists as any)?.records || [];
  const normalizedRmInward = Array.isArray(initialRmInward)
    ? initialRmInward
    : (initialRmInward as any)?.records || [];
  const normalizedGrns = Array.isArray(initialGrns)
    ? initialGrns
    : (initialGrns as any)?.records || [];

  const [checklists, setChecklists] = useState<any[]>(normalizedChecklists);
  const [rmInwardList, setRmInwardList] = useState<any[]>(normalizedRmInward);
  const [grnList, setGrnList] = useState<any[]>(normalizedGrns);

  useEffect(() => {
    if (initialChecklists) {
      setChecklists(
        Array.isArray(initialChecklists)
          ? initialChecklists
          : (initialChecklists as any)?.records || []
      );
    }
  }, [initialChecklists]);

  useEffect(() => {
    if (initialRmInward) {
      setRmInwardList(
        Array.isArray(initialRmInward)
          ? initialRmInward
          : (initialRmInward as any)?.records || []
      );
    }
  }, [initialRmInward]);

  useEffect(() => {
    if (initialGrns) {
      setGrnList(
        Array.isArray(initialGrns)
          ? initialGrns
          : (initialGrns as any)?.records || []
      );
    }
  }, [initialGrns]);

  // Modal states
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [isRmInwardModalOpen, setIsRmInwardModalOpen] = useState(false);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [selectedGrnPreview, setSelectedGrnPreview] = useState<any | null>(null);

  // Checklist form
  const [checklistForm, setChecklistForm] = useState<Record<string, any>>({
    poNumber: "Verbal",
    materialName: "",
    standard: "In-House Specification",
    supplierName: "",
    manufacturerName: "",
    batchNumber: "",
    quantityReceived: "",
    totalContainers: "",
    packingCondition: "OK",
    outerPackaging: "SEALED",
    drumType: "Fiber Board Drum",
    vehicleNumber: "",
    timeEntered: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
    vehicleCondition: "COVERED",
    vendorApprovalStatus: "APPROVED_VENDOR",
    coaReceived: "YES",
    lrNoDate: "YES",
    consignmentReceivedBy: currentUser?.fullName || "Prem N Patel",
    checkedByQc: "Ketan M. Parmar",
    verifiedByQa: "Sankarsana Patra",
  });

  // RM Inward form
  const [inwardForm, setInwardForm] = useState<Record<string, any>>({
    supplierName: "",
    challanNo: "-",
    materialName: "",
    quantity: "",
    poNumber: "Verbal",
    invoiceNo: "",
    grnNo: "",
    receiverSign: `${currentUser?.fullName || "Prem N Patel"} / ${new Date().toLocaleDateString("en-IN")}`,
    remarks: "Purch. sc",
  });

  // GRN form
  const [grnForm, setGrnForm] = useState<Record<string, any>>({
    grnNumber: "",
    poNumber: "Verbal",
    supplierName: "",
    supplierAddress: "",
    invoiceNo: "",
    vehicleNo: "",
    materialName: "",
    materialCode: "PM04",
    batchNumber: "",
    quantityReceived: "",
    numberOfContainers: "",
    materialCondition: "OK",
    packingCondition: "OK",
    labelStatus: "PROPER",
    quantityVerified: "YES",
    sampledBy: "Ketan",
    statusLabelAffixed: "APPROVED",
    storeSupervisorSign: currentUser?.fullName || "Prem N Patel",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === "checklist") {
        const res = await fetch(`/api/warehouse/checklist?search=${encodeURIComponent(search)}&date=${dateFilter}`);
        const d = await res.json();
        if (d.records) setChecklists(d.records);
      } else if (activeTab === "inward") {
        const res = await fetch(`/api/warehouse/rm-inward?search=${encodeURIComponent(search)}&date=${dateFilter}`);
        const d = await res.json();
        if (d.records) setRmInwardList(d.records);
      } else if (activeTab === "grn") {
        const res = await fetch(`/api/warehouse/detailed-grn?search=${encodeURIComponent(search)}&date=${dateFilter}`);
        const d = await res.json();
        if (d.records) setGrnList(d.records);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, search, dateFilter]);

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/warehouse/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checklistForm),
      });
      if (res.ok) {
        setIsChecklistModalOpen(false);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create checklist");
      }
    } catch (err) {
      alert("Error submitting checklist");
    }
  };

  const handleCreateInward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/warehouse/rm-inward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inwardForm),
      });
      if (res.ok) {
        setIsRmInwardModalOpen(false);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create inward record");
      }
    } catch (err) {
      alert("Error submitting inward record");
    }
  };

  const handleCreateGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/warehouse/detailed-grn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(grnForm),
      });
      if (res.ok) {
        setIsGrnModalOpen(false);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create GRN");
      }
    } catch (err) {
      alert("Error submitting GRN");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header with dual-entry notice */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-linear-to-r from-slate-50 via-emerald-50/20 to-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <ClipboardCheck className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Warehouse & Security Gate Joint SOP Registers
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Dual Entry (Gate & Warehouse)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Physical receiving workflows digitized as per SOP ADM/SOP/02 • Recordable by Security Gate & Warehouse
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>

          {activeTab === "checklist" && (
            <Button
              size="sm"
              onClick={() => setIsChecklistModalOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 h-8.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New RM Checklist (F07)
            </Button>
          )}

          {activeTab === "inward" && (
            <Button
              size="sm"
              onClick={() => setIsRmInwardModalOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 h-8.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Log RM Inward (F13)
            </Button>
          )}

          {activeTab === "grn" && (
            <Button
              size="sm"
              onClick={() => setIsGrnModalOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 h-8.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Generate GRN (F12)
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-slate-50/60 px-4 pt-2.5 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("checklist")}
          className={`px-3 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === "checklist"
              ? "bg-white text-emerald-800 border-emerald-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>1. Incoming RM Checklist (F07)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-semibold">
            {checklists.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("inward")}
          className={`px-3 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === "inward"
              ? "bg-white text-emerald-800 border-emerald-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70"
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          <span>2. Raw Material Inward Register (F13)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-semibold">
            {rmInwardList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("grn")}
          className={`px-3 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === "grn"
              ? "bg-white text-emerald-800 border-emerald-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70"
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>3. Goods Received Note - GRN (F12)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-semibold">
            {grnList.length}
          </span>
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="p-3.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search supplier, material, vehicle no, PO, GRN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 focus:outline-none"
            />
            {dateFilter && (
              <button onClick={() => setDateFilter("")} className="text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          Format:{" "}
          <span className="font-mono font-semibold text-slate-700">
            {activeTab === "checklist" && "ADM/SOP/02/F07 (Rev 08)"}
            {activeTab === "inward" && "ADM/SOP/02/F13 (Rev 08)"}
            {activeTab === "grn" && "ADM/SOP/02/F12 (Rev 08)"}
          </span>
        </div>
      </div>

      {/* ----------------- TAB 1: INCOMING RAW MATERIAL CHECKLIST ----------------- */}
      {activeTab === "checklist" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Checklist No</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Material & Standard</th>
                <th className="py-2.5 px-3">Supplier / Mfg</th>
                <th className="py-2.5 px-3">Batch & Qty</th>
                <th className="py-2.5 px-3">Vehicle & Time</th>
                <th className="py-2.5 px-3">Packing Condition</th>
                <th className="py-2.5 px-3">Received By</th>
                <th className="py-2.5 px-3">QC & QA Sign</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {!Array.isArray(checklists) || checklists.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No checklists found. Click &quot;New RM Checklist&quot; to log incoming material.
                  </td>
                </tr>
              ) : (
                checklists.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{row.checklistNumber}</td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      <div>{row.materialName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{row.standard || "In-House"} • PO: {row.poNumber || "-"}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      <div className="font-semibold">{row.supplierName}</div>
                      {row.manufacturerName && row.manufacturerName !== row.supplierName && (
                        <div className="text-[10px] text-slate-400">Mfg: {row.manufacturerName}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-medium text-slate-900">{row.quantityReceived || "-"}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Lot: {row.batchNumber || "-"}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-semibold text-slate-800 uppercase">{row.vehicleNumber}</div>
                      <div className="text-[10px] text-slate-400">{row.timeEntered || "-"} • {row.vehicleCondition}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {row.packingCondition} ({row.drumType || row.bagType || row.outerPackaging})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {row.consignmentReceivedBy || "Store"}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-600">
                      <div>QC: {row.checkedByQc || "Ketan M."}</div>
                      <div className="text-[10px] text-slate-400">QA: {row.verifiedByQa || "Verified"}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ----------------- TAB 2: RAW MATERIAL INWARD REGISTER (F13) ----------------- */}
      {activeTab === "inward" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3 w-12">Sr.</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Supplier / Manufacturer</th>
                <th className="py-2.5 px-3">Challan No / Date</th>
                <th className="py-2.5 px-3">Material Name</th>
                <th className="py-2.5 px-3">Qty. (Containers x Kg)</th>
                <th className="py-2.5 px-3">PO No.</th>
                <th className="py-2.5 px-3">Invoice No.</th>
                <th className="py-2.5 px-3">GRN No. / Date</th>
                <th className="py-2.5 px-3">Sign / Date</th>
                <th className="py-2.5 px-3">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {!Array.isArray(rmInwardList) || rmInwardList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    No inward register entries found. Click &quot;Log RM Inward&quot; to add.
                  </td>
                </tr>
              ) : (
                rmInwardList.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{row.srNo || idx + 1}</td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{row.supplierName}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      <div>{row.challanNo || "-"}</div>
                      <div className="text-[10px] text-slate-400">{row.challanDate ? formatDate(row.challanDate) : "-"}</div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{row.materialName}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{row.quantity}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{row.poNumber || "-"}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{row.invoiceNo || "-"}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-slate-100 text-slate-800">
                        GRN-{row.grnNo || "-"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">{row.receiverSign || "-"}</td>
                    <td className="py-2.5 px-3 text-slate-500">{row.remarks || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ----------------- TAB 3: GOODS RECEIVED NOTE - GRN (F12) ----------------- */}
      {activeTab === "grn" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">GRN No</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Supplier Name & Address</th>
                <th className="py-2.5 px-3">Invoice & Vehicle</th>
                <th className="py-2.5 px-3">Material Name & Code</th>
                <th className="py-2.5 px-3">Batch & Qty Received</th>
                <th className="py-2.5 px-3">Physical Check</th>
                <th className="py-2.5 px-3">QC Status</th>
                <th className="py-2.5 px-3 text-right">View Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {!Array.isArray(grnList) || grnList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No GRN notes recorded yet.
                  </td>
                </tr>
              ) : (
                grnList.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {row.grnNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{formatDate(row.grnDate)}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{row.supplierName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{row.supplierAddress || "-"}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      <div>{row.invoiceNo}</div>
                      <div className="text-[10px] text-slate-400">{row.vehicleNo || "-"}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900">{row.materialName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Code: {row.materialCode || "-"}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <div className="font-semibold text-slate-900">{row.quantityReceived || `${row.numberOfContainers || 0} Containers`}</div>
                      <div className="text-[10px] text-slate-500">Batch: {row.batchNumber || "-"}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {row.materialCondition} / {row.packingCondition}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {row.statusLabelAffixed || "APPROVED"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedGrnPreview(row)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-3 h-3" />
                        View Note
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ----------------- MODAL: INCOMING RM CHECKLIST FORM (F07) ----------------- */}
      {isChecklistModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  INCOMING RAW MATERIAL CHECK LIST
                </h3>
                <p className="text-xs text-slate-500">Format No.: ADM/SOP/02/F07 • Dual Entry: Warehouse / Gate</p>
              </div>
              <button
                onClick={() => setIsChecklistModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChecklist} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Order No (Reference) *</label>
                  <input
                    type="text"
                    required
                    value={checklistForm.poNumber || "Verbal"}
                    onChange={(e) => setChecklistForm({ ...checklistForm, poNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Name of Material with Standard *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paper Drum / PHTHALIC ANHYDRIDE"
                    value={checklistForm.materialName || ""}
                    onChange={(e) => setChecklistForm({ ...checklistForm, materialName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B.M. Paper Packaging"
                    value={checklistForm.supplierName || ""}
                    onChange={(e) => setChecklistForm({ ...checklistForm, supplierName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch No & Qty Received</label>
                  <input
                    type="text"
                    placeholder="e.g. HP-55, 274 Nos"
                    value={checklistForm.batchNumber || ""}
                    onChange={(e) => setChecklistForm({ ...checklistForm, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle No. *</label>
                  <input
                    type="text"
                    required
                    placeholder="MH 18 AA 9778"
                    value={checklistForm.vehicleNumber || ""}
                    onChange={(e) => setChecklistForm({ ...checklistForm, vehicleNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time Entered</label>
                  <input
                    type="text"
                    placeholder="10:30"
                    value={checklistForm.timeEntered || ""}
                    onChange={(e) => setChecklistForm({ ...checklistForm, timeEntered: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Containers</label>
                  <input
                    type="text"
                    placeholder="274 Nos"
                    value={checklistForm.totalContainers || ""}
                    onChange={(e) => setChecklistForm({ ...checklistForm, totalContainers: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Packing Condition</label>
                  <select
                    value={checklistForm.packingCondition || "OK"}
                    onChange={(e) => setChecklistForm({ ...checklistForm, packingCondition: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="OK">OK</option>
                    <option value="NOT_OK">NOT OK</option>
                    <option value="DAMAGED">Damages</option>
                    <option value="BROKEN">Broken</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Outer Packaging</label>
                  <select
                    value={checklistForm.outerPackaging || "SEALED"}
                    onChange={(e) => setChecklistForm({ ...checklistForm, outerPackaging: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="SEALED">Sealed</option>
                    <option value="UNSEALED">Unsealed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Drum / Container Type</label>
                  <select
                    value={checklistForm.drumType || "Fiber Board Drum"}
                    onChange={(e) => setChecklistForm({ ...checklistForm, drumType: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Fiber Board Drum">Fiber Board Drum</option>
                    <option value="HDPE Drum">HDPE Drum</option>
                    <option value="Plastic Container">Plastic Container</option>
                    <option value="Metal Drum">Metal Drum</option>
                    <option value="HDPE Bag">HDPE Multiwall Bag</option>
                    <option value="Tanker">Road Tanker</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">COA Received?</label>
                  <select
                    value={checklistForm.coaReceived || "YES"}
                    onChange={(e) => setChecklistForm({ ...checklistForm, coaReceived: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Status</label>
                  <select
                    value={checklistForm.vendorApprovalStatus || "APPROVED_VENDOR"}
                    onChange={(e) => setChecklistForm({ ...checklistForm, vendorApprovalStatus: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="APPROVED_VENDOR">Approved Vendor</option>
                    <option value="PROVISIONAL">Provisional Approved Vendor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Consignment Received By (Warehouse / Security)</label>
                <input
                  type="text"
                  value={checklistForm.consignmentReceivedBy || ""}
                  onChange={(e) => setChecklistForm({ ...checklistForm, consignmentReceivedBy: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsChecklistModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                  Save Checklist Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: RAW MATERIAL INWARD ENTRY (F13) ----------------- */}
      {isRmInwardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-700" />
                  RAW MATERIAL INWARD REGISTER
                </h3>
                <p className="text-xs text-slate-500">Format No.: ADM/SOP/02/F13</p>
              </div>
              <button onClick={() => setIsRmInwardModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInward} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier / Manufacturer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B. M. Paper Packaging"
                  value={inwardForm.supplierName || ""}
                  onChange={(e) => setInwardForm({ ...inwardForm, supplierName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Material Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paper Drum (NOS)"
                    value={inwardForm.materialName || ""}
                    onChange={(e) => setInwardForm({ ...inwardForm, materialName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Qty. (No. of Cont. x---kg) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 274 Nos / 8000 kg"
                    value={inwardForm.quantity || ""}
                    onChange={(e) => setInwardForm({ ...inwardForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PO No.</label>
                  <input
                    type="text"
                    value={inwardForm.poNumber || "Verbal"}
                    onChange={(e) => setInwardForm({ ...inwardForm, poNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice No.</label>
                  <input
                    type="text"
                    placeholder="BMPP/26-27/249"
                    value={inwardForm.invoiceNo || ""}
                    onChange={(e) => setInwardForm({ ...inwardForm, invoiceNo: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GRN No.</label>
                  <input
                    type="text"
                    placeholder="92"
                    value={inwardForm.grnNo || ""}
                    onChange={(e) => setInwardForm({ ...inwardForm, grnNo: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remark</label>
                <input
                  type="text"
                  value={inwardForm.remarks || "Purch. sc"}
                  onChange={(e) => setInwardForm({ ...inwardForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsRmInwardModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                  Add to Register
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: DETAILED GRN CREATION (F12) ----------------- */}
      {isGrnModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-700" />
                  GOODS RECEIVED NOTE (GRN)
                </h3>
                <p className="text-xs text-slate-500">Format No.: ADM/SOP/02/F12 • Master Copy</p>
              </div>
              <button onClick={() => setIsGrnModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGrn} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GRN No. *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 97"
                    value={grnForm.grnNumber || ""}
                    onChange={(e) => setGrnForm({ ...grnForm, grnNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Order No.</label>
                  <input
                    type="text"
                    value={grnForm.poNumber || "Verbal"}
                    onChange={(e) => setGrnForm({ ...grnForm, poNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.M. Paper Packaging"
                  value={grnForm.supplierName || ""}
                  onChange={(e) => setGrnForm({ ...grnForm, supplierName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice No. & Date</label>
                  <input
                    type="text"
                    placeholder="BMPP/26-27/249 & 2-9-2026"
                    value={grnForm.invoiceNo || ""}
                    onChange={(e) => setGrnForm({ ...grnForm, invoiceNo: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle No.</label>
                  <input
                    type="text"
                    placeholder="MH18AA9778"
                    value={grnForm.vehicleNo || ""}
                    onChange={(e) => setGrnForm({ ...grnForm, vehicleNo: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Material Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Paper Drum"
                    value={grnForm.materialName || ""}
                    onChange={(e) => setGrnForm({ ...grnForm, materialName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Material Code</label>
                  <input
                    type="text"
                    placeholder="PM04"
                    value={grnForm.materialCode || ""}
                    onChange={(e) => setGrnForm({ ...grnForm, materialCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch No.</label>
                  <input
                    type="text"
                    placeholder="HP55"
                    value={grnForm.batchNumber || ""}
                    onChange={(e) => setGrnForm({ ...grnForm, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Qty Received / Containers</label>
                  <input
                    type="text"
                    placeholder="247 Nos"
                    value={grnForm.quantityReceived || ""}
                    onChange={(e) => setGrnForm({ ...grnForm, quantityReceived: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Label Affixed</label>
                  <select
                    value={grnForm.statusLabelAffixed || "APPROVED"}
                    onChange={(e) => setGrnForm({ ...grnForm, statusLabelAffixed: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="APPROVED">Approved</option>
                    <option value="QUARANTINE">Quarantine</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsGrnModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                  Generate GRN Document
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: DETAILED GRN PREVIEW / PRINT (EXACT IMAGE 3) ----------------- */}
      {selectedGrnPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Action Bar */}
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Document Preview: Format ADM/SOP/02/F12
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => window.print()} className="h-7.5 text-xs gap-1">
                  <Printer className="w-3.5 h-3.5" />
                  Print Note
                </Button>
                <button
                  onClick={() => setSelectedGrnPreview(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Body Formatted Exactly as Image 3 */}
            <div className="p-8 overflow-y-auto space-y-4 text-slate-900 font-sans print:p-0">
              {/* Header Box */}
              <div className="border border-slate-900 p-3 text-center relative">
                <div className="absolute right-3 top-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                  MASTER COPY • Page 1 of 1
                </div>
                <div className="font-extrabold text-sm tracking-wide">DEEPAK CELLULOSE PRIVATE LIMITED</div>
                <div className="text-xs font-bold mt-0.5">GOODS RECEIVED NOTE (GRN)</div>
                <div className="text-[10px] text-slate-600 mt-1 flex justify-center gap-4 border-t border-slate-300 pt-1 font-mono">
                  <span>Format No.: ADM/SOP/02/F12</span>
                  <span>Rev No.: 08</span>
                  <span>SOP No.: ADM/SOP/02</span>
                  <span>Dept: ADM</span>
                </div>
              </div>

              {/* 1. General Info Table */}
              <div className="border border-slate-900 text-xs">
                <div className="bg-slate-100 font-bold px-3 py-1 border-b border-slate-900">1. General Information :</div>
                <div className="grid grid-cols-2 divide-x divide-slate-900">
                  <div className="p-2 space-y-1">
                    <div><span className="font-semibold">GRN No.:</span> <span className="font-mono font-bold">{selectedGrnPreview.grnNumber}</span></div>
                    <div><span className="font-semibold">PO No.:</span> {selectedGrnPreview.poNumber || "Verbal"}</div>
                    <div><span className="font-semibold">Supplier Name:</span> <span className="font-bold">{selectedGrnPreview.supplierName}</span></div>
                    <div><span className="font-semibold">Supplier Address:</span> {selectedGrnPreview.supplierAddress || "-"}</div>
                  </div>
                  <div className="p-2 space-y-1">
                    <div><span className="font-semibold">GRN Date:</span> {formatDate(selectedGrnPreview.grnDate)}</div>
                    <div><span className="font-semibold">Invoice No. & Date:</span> {selectedGrnPreview.invoiceNo || "-"}</div>
                    <div><span className="font-semibold">Transporter:</span> {selectedGrnPreview.transporterName || "-"}</div>
                    <div><span className="font-semibold">Vehicle No.:</span> <span className="font-mono font-bold uppercase">{selectedGrnPreview.vehicleNo || "-"}</span></div>
                  </div>
                </div>
              </div>

              {/* 2. Material Details Table */}
              <div className="border border-slate-900 text-xs">
                <div className="bg-slate-100 font-bold px-3 py-1 border-b border-slate-900">2. Material Details :</div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 font-bold bg-slate-50">
                      <th className="p-1.5 border-r border-slate-900 w-10">Sr.</th>
                      <th className="p-1.5 border-r border-slate-900">Material Name</th>
                      <th className="p-1.5 border-r border-slate-900">Material Code</th>
                      <th className="p-1.5 border-r border-slate-900">Batch No.</th>
                      <th className="p-1.5 border-r border-slate-900">Qty Received</th>
                      <th className="p-1.5">No. of Containers</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border-r border-slate-900 font-mono">1</td>
                      <td className="p-2 border-r border-slate-900 font-bold">{selectedGrnPreview.materialName}</td>
                      <td className="p-2 border-r border-slate-900 font-mono">{selectedGrnPreview.materialCode || "-"}</td>
                      <td className="p-2 border-r border-slate-900 font-mono">{selectedGrnPreview.batchNumber || "-"}</td>
                      <td className="p-2 border-r border-slate-900 font-mono font-bold">{selectedGrnPreview.quantityReceived || "-"}</td>
                      <td className="p-2 font-mono font-bold">{selectedGrnPreview.numberOfContainers || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 3. Physical Verification Table */}
              <div className="border border-slate-900 text-xs">
                <div className="bg-slate-100 font-bold px-3 py-1 border-b border-slate-900">3. Physical Verification :</div>
                <div className="grid grid-cols-2 divide-x divide-slate-900 p-2 gap-y-1 text-xs">
                  <div>1. Condition of Material: <span className="font-bold underline">{selectedGrnPreview.materialCondition || "Ok"}</span></div>
                  <div>2. Packing Condition: <span className="font-bold underline">{selectedGrnPreview.packingCondition || "OK"}</span></div>
                  <div>3. Label Status: <span className="font-bold underline">{selectedGrnPreview.labelStatus || "Proper"}</span></div>
                  <div>4. Quantity Verified: <span className="font-bold underline">{selectedGrnPreview.quantityVerified || "Yes"}</span></div>
                </div>
              </div>

              {/* 4. Sampling & QC Status */}
              <div className="border border-slate-900 text-xs">
                <div className="bg-slate-100 font-bold px-3 py-1 border-b border-slate-900">Sampling & QC Status :</div>
                <div className="grid grid-cols-2 divide-x divide-slate-900 p-2 text-xs">
                  <div>
                    <div>Sampled By: <span className="font-semibold">{selectedGrnPreview.sampledBy || "Ketan"}</span></div>
                    <div>QC Reference No.: <span className="font-mono">{selectedGrnPreview.qcReferenceNo || "A/366/26"}</span></div>
                  </div>
                  <div>
                    <div>Status Label Affixed: <span className="font-bold underline">{selectedGrnPreview.statusLabelAffixed || "Approved"}</span></div>
                  </div>
                </div>
              </div>

              {/* 5. Verification & Approval Signatures */}
              <div className="border border-slate-900 text-xs">
                <div className="bg-slate-100 font-bold px-3 py-1 border-b border-slate-900">5. Verification and Approval :</div>
                <div className="divide-y divide-slate-900 text-xs">
                  <div className="p-2 flex justify-between items-center">
                    <span>Material Received and Prepared By (Store Supervisor):</span>
                    <span className="font-bold">{selectedGrnPreview.storeSupervisorSign || "Prem N Patel"}</span>
                  </div>
                  <div className="p-2 flex justify-between items-center">
                    <span>QC Sampling, Testing and Released By:</span>
                    <span className="font-bold">Ketan M. Parmar</span>
                  </div>
                  <div className="p-2 flex justify-between items-center">
                    <span>Approved By (QA Executive / Manager):</span>
                    <span className="font-bold">Sankarsana Patra (Manager QA)</span>
                  </div>
                </div>
              </div>

              {/* Footer Governance */}
              <div className="border border-slate-900 grid grid-cols-3 divide-x divide-slate-900 text-[10px] text-center p-1.5 font-semibold text-slate-600">
                <div>Prepared By: Bhavin M. Patel</div>
                <div>Checked By: Devendra Purohit (CFO)</div>
                <div>Approved By: Sankarsana Patra (QA Head)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
