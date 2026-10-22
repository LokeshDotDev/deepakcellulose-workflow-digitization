"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Plus,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  FileSpreadsheet,
  X,
  RefreshCw,
  LogOut,
  Building,
  Phone,
  Calendar,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface HrRegistryClientProps {
  initialAttendance: any[];
  initialVisitors: any[];
  initialStaff: any[];
  initialInward: any[];
  initialOutward: any[];
  currentUser: {
    fullName: string;
    role: string;
    department?: string;
  };
}

type TabType = "attendance" | "visitors" | "staff" | "inward" | "outward";

export function HrRegistryClient({
  initialAttendance,
  initialVisitors,
  initialStaff,
  initialInward,
  initialOutward,
  currentUser,
}: HrRegistryClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("attendance");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Data states
  const [attendanceList, setAttendanceList] = useState(initialAttendance);
  const [visitorList, setVisitorList] = useState(initialVisitors);
  const [staffList, setStaffList] = useState(initialStaff);
  const [inwardList, setInwardList] = useState(initialInward);
  const [outwardList, setOutwardList] = useState(initialOutward);

  // Quick punch out modal
  const [punchOutModal, setPunchOutModal] = useState<{
    open: boolean;
    type: TabType;
    id: string;
    name: string;
    outTime: string;
  } | null>(null);

  // Creation form state
  const getCurrentFormattedTime = () => {
    return new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const [formData, setFormData] = useState<Record<string, any>>({
    inTime: getCurrentFormattedTime(),
    category: "PERMANENT",
    status: "IN_PREMISES",
  });

  const resetForm = () => {
    setFormData({
      inTime: getCurrentFormattedTime(),
      outTime: "",
      category: "PERMANENT",
      contractorName: "Jalaram",
      otHours: "0",
      status: "IN_PREMISES",
    });
  };

  const refreshActiveData = async () => {
    try {
      setLoading(true);
      if (activeTab === "attendance") {
        const res = await fetch(`/api/hr-admin/attendance?search=${encodeURIComponent(searchQuery)}&date=${dateFilter}&category=${statusFilter}`);
        const data = await res.json();
        if (data.records) setAttendanceList(data.records);
      } else if (activeTab === "visitors") {
        const res = await fetch(`/api/hr-admin/visitors?search=${encodeURIComponent(searchQuery)}&date=${dateFilter}&status=${statusFilter}`);
        const data = await res.json();
        if (data.records) setVisitorList(data.records);
      } else if (activeTab === "staff") {
        const res = await fetch(`/api/hr-admin/staff?search=${encodeURIComponent(searchQuery)}&date=${dateFilter}&status=${statusFilter}`);
        const data = await res.json();
        if (data.records) setStaffList(data.records);
      } else if (activeTab === "inward") {
        const res = await fetch(`/api/hr-admin/material-inward?search=${encodeURIComponent(searchQuery)}&date=${dateFilter}&status=${statusFilter}`);
        const data = await res.json();
        if (data.records) setInwardList(data.records);
      } else if (activeTab === "outward") {
        const res = await fetch(`/api/hr-admin/material-outward?search=${encodeURIComponent(searchQuery)}&date=${dateFilter}&status=${statusFilter}`);
        const data = await res.json();
        if (data.records) setOutwardList(data.records);
      }
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshActiveData();
  }, [activeTab, searchQuery, dateFilter, statusFilter]);

  const handleExportCsv = () => {
    window.location.href = `/api/hr-admin/export?register=${activeTab}&date=${dateFilter}`;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      let endpoint = `/api/hr-admin/${activeTab}`;
      if (activeTab === "inward") endpoint = "/api/hr-admin/material-inward";
      if (activeTab === "outward") endpoint = "/api/hr-admin/material-outward";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const resData = await res.json();
      if (!res.ok) {
        alert(resData.error || "Failed to record entry");
        return;
      }

      setIsModalOpen(false);
      resetForm();
      await refreshActiveData();
    } catch (err: any) {
      console.error("Submit error:", err);
      alert("Submission error. Please check fields.");
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    if (!punchOutModal) return;
    try {
      setActionLoadingId(punchOutModal.id);
      let endpoint = `/api/hr-admin/${punchOutModal.type}`;
      if (punchOutModal.type === "inward") endpoint = "/api/hr-admin/material-inward";
      if (punchOutModal.type === "outward") endpoint = "/api/hr-admin/material-outward";

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: punchOutModal.id,
          outTime: punchOutModal.outTime || getCurrentFormattedTime(),
          inTime: punchOutModal.type === "staff" ? (punchOutModal.outTime || getCurrentFormattedTime()) : undefined,
          status: punchOutModal.type === "visitors" ? "DEPARTED" : punchOutModal.type === "staff" ? "RETURNED" : punchOutModal.type === "inward" ? "UNLOADED" : "DISPATCHED",
        }),
      });

      if (res.ok) {
        setPunchOutModal(null);
        await refreshActiveData();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to punch out");
      }
    } catch (err) {
      console.error(err);
      alert("Error recording out time");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Calculations for overall KPIs
  const activeWorkersPresent = attendanceList.filter((a) => !a.outTime).length;
  const permanentCount = attendanceList.filter((a) => a.category === "PERMANENT").length;
  const contractCount = attendanceList.filter((a) => a.category !== "PERMANENT").length;
  const activeVisitorsInPremises = visitorList.filter((v) => v.status === "IN_PREMISES").length;
  const staffCurrentlyOut = staffList.filter((s) => s.status === "OUT").length;
  const inwardInPlant = inwardList.filter((i) => i.status === "IN_PLANT").length;
  const outwardInLoading = outwardList.filter((o) => o.status === "LOADING").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-fuchsia-100 text-fuchsia-700 rounded-xl shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">HR Admin & Digital Gate Registries</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Digitized Plant Registry
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Managed in HR Admin • Daily logs recorded and maintained by Security Gate, HR, or Super Admin
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={refreshActiveData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-fuchsia-600" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <Button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="bg-fuchsia-700 hover:bg-fuchsia-800 text-white gap-2 shadow-xs cursor-pointer text-xs h-9"
          >
            <Plus className="w-4 h-4" />
            {activeTab === "attendance" && "Record Attendance"}
            {activeTab === "visitors" && "Log Visitor Entry"}
            {activeTab === "staff" && "Record Staff Gate Pass"}
            {activeTab === "inward" && "Log Material Inward"}
            {activeTab === "outward" && "Log Material Outward"}
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Workers In Shift</span>
            <span className="p-1 rounded-md bg-indigo-50 text-indigo-600"><Users className="w-3.5 h-3.5" /></span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-900">{activeWorkersPresent} <span className="text-xs font-normal text-slate-400">/ {attendanceList.length} total</span></div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              <span className="font-medium text-indigo-600">{permanentCount} Perm</span> •{" "}
              <span className="font-medium text-amber-600">{contractCount} Contract</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Visitors In Plant</span>
            <span className="p-1 rounded-md bg-amber-50 text-amber-600"><UserCheck className="w-3.5 h-3.5" /></span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-amber-600">{activeVisitorsInPremises}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{visitorList.length} total registered today</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Staff Currently Out</span>
            <span className="p-1 rounded-md bg-rose-50 text-rose-600"><UserX className="w-3.5 h-3.5" /></span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-rose-600">{staffCurrentlyOut}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{staffList.length - staffCurrentlyOut} returned back</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Material Inward</span>
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-600"><ArrowDownLeft className="w-3.5 h-3.5" /></span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-emerald-700">{inwardInPlant} <span className="text-xs font-normal text-slate-400">in plant</span></div>
            <div className="text-[10px] text-slate-400 mt-0.5">{inwardList.length} total deliveries logged</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Material Outward</span>
            <span className="p-1 rounded-md bg-cyan-50 text-cyan-600"><ArrowUpRight className="w-3.5 h-3.5" /></span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-cyan-700">{outwardInLoading} <span className="text-xs font-normal text-slate-400">loading</span></div>
            <div className="text-[10px] text-slate-400 mt-0.5">{outwardList.length} dispatched shipments</div>
          </div>
        </div>
      </div>

      {/* Main Registry Container with Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs corresponding directly to the physical spreadsheet sheets */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 pt-3 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setActiveTab("attendance");
              setStatusFilter("ALL");
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === "attendance"
                ? "bg-white text-fuchsia-700 border-fuchsia-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Attendance (Permanent & Contract)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-semibold">
              {attendanceList.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("visitors");
              setStatusFilter("ALL");
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === "visitors"
                ? "bg-white text-fuchsia-700 border-fuchsia-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Visitor&apos;s Register</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-semibold">
              {visitorList.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("staff");
              setStatusFilter("ALL");
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === "staff"
                ? "bg-white text-fuchsia-700 border-fuchsia-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70"
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Staff In / Out Register</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-semibold">
              {staffList.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("inward");
              setStatusFilter("ALL");
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === "inward"
                ? "bg-white text-fuchsia-700 border-fuchsia-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70"
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Goods & Material Inward</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-semibold">
              {inwardList.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("outward");
              setStatusFilter("ALL");
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === "outward"
                ? "bg-white text-fuchsia-700 border-fuchsia-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Goods & Material Outward</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-semibold">
              {outwardList.length}
            </span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-2xl">
            {/* Live Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={
                  activeTab === "attendance"
                    ? "Search name, Emp Code, contractor..."
                    : activeTab === "visitors"
                    ? "Search visitor, person to meet, company, phone..."
                    : activeTab === "staff"
                    ? "Search staff name, dept, reason..."
                    : "Search party name, invoice/challan, vehicle no..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500"
              />
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="Clear date"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category / Status Filter */}
            {activeTab === "attendance" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="PERMANENT">Permanent Employees</option>
                <option value="CONTRACT_JALARAM">Contract - Jalaram</option>
                <option value="CONTRACT_YOGITA">Contract - Yogita</option>
                <option value="CONTRACT_OTHER">Other Contractors</option>
              </select>
            )}

            {activeTab === "visitors" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="IN_PREMISES">Inside Premises</option>
                <option value="DEPARTED">Departed</option>
              </select>
            )}

            {activeTab === "staff" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="OUT">Currently Out</option>
                <option value="RETURNED">Returned</option>
              </select>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Active Registry: <span className="font-semibold text-slate-800">
              {activeTab === "attendance" && "Permanent and Contract Base (Jalaram/ Yogita)"}
              {activeTab === "visitors" && "VISITOR'S REGISTER"}
              {activeTab === "staff" && "Staff In / Out Register"}
              {activeTab === "inward" && "Goods and Material Inward Details"}
              {activeTab === "outward" && "Goods and Material Outward/Dispatch Details"}
            </span>
          </div>
        </div>

        {/* ----------------- TAB 1: ATTENDANCE REGISTER ----------------- */}
        {activeTab === "attendance" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4 w-14">Sr. No.</th>
                  <th className="py-3 px-4">Emp Code</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Worker Type / Contractor</th>
                  <th className="py-3 px-4">In Time</th>
                  <th className="py-3 px-4">Out Time</th>
                  <th className="py-3 px-4">OT Hours</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {attendanceList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No attendance entries recorded for this filter.
                    </td>
                  </tr>
                ) : (
                  attendanceList.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-400">{row.srNo || idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 font-mono">{row.empCode}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{row.name}</td>
                      <td className="py-3 px-4">
                        {row.category === "PERMANENT" ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Permanent
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Contract ({row.contractorName || (row.category === "CONTRACT_JALARAM" ? "Jalaram" : "Yogita")})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-emerald-700">{row.inTime}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {row.outTime ? (
                          row.outTime
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 animate-pulse">
                            On Shift
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {row.otHours ? `${Number(row.otHours).toFixed(1)} hrs` : "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={row.remarks || ""}>
                        {row.remarks || "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!row.outTime && (
                          <button
                            onClick={() =>
                              setPunchOutModal({
                                open: true,
                                type: "attendance",
                                id: row.id,
                                name: row.name,
                                outTime: getCurrentFormattedTime(),
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-200 rounded-lg transition cursor-pointer"
                          >
                            Punch Out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ----------------- TAB 2: VISITOR'S REGISTER ----------------- */}
        {activeTab === "visitors" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4 w-14">Sr. No.</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Related Person/ To Meet</th>
                  <th className="py-3 px-4">Company / Visiting From</th>
                  <th className="py-3 px-4">In Time</th>
                  <th className="py-3 px-4">Out Time</th>
                  <th className="py-3 px-4">Mobile No.</th>
                  <th className="py-3 px-4">Status / Signature</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {visitorList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No visitors logged for this criteria.
                    </td>
                  </tr>
                ) : (
                  visitorList.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-400">{row.srNo || idx + 1}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(row.date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{row.name}</div>
                        {row.badgeNo && (
                          <div className="text-[10px] text-slate-400 font-mono font-normal">Pass: {row.badgeNo}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{row.relatedPerson}</td>
                      <td className="py-3 px-4 text-slate-600">{row.company || "-"}</td>
                      <td className="py-3 px-4 font-mono font-medium text-emerald-700">{row.inTime}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{row.outTime || "-"}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{row.mobileNo}</td>
                      <td className="py-3 px-4">
                        {row.status === "IN_PREMISES" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            Inside Premises
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Departed
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {row.status === "IN_PREMISES" && (
                          <button
                            onClick={() =>
                              setPunchOutModal({
                                open: true,
                                type: "visitors",
                                id: row.id,
                                name: row.name,
                                outTime: getCurrentFormattedTime(),
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer"
                          >
                            Mark Exit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ----------------- TAB 3: STAFF IN / OUT REGISTER ----------------- */}
        {activeTab === "staff" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4 w-14">Sr. No.</th>
                  <th className="py-3 px-4">Staff Name</th>
                  <th className="py-3 px-4">Department / Code</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Out Time</th>
                  <th className="py-3 px-4">In Time</th>
                  <th className="py-3 px-4">Remark/ Reason</th>
                  <th className="py-3 px-4">Approved By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No staff movements recorded for this criteria.
                    </td>
                  </tr>
                ) : (
                  staffList.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-400">{row.srNo || idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{row.staffName}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {row.department || "-"} {row.empCode ? `(${row.empCode})` : ""}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(row.date)}</td>
                      <td className="py-3 px-4 font-mono font-medium text-rose-600">{row.outTime || "-"}</td>
                      <td className="py-3 px-4 font-mono font-medium text-emerald-700">
                        {row.inTime ? (
                          row.inTime
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 animate-pulse">
                            Out on Pass
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-sm truncate" title={row.remarkReason}>
                        {row.remarkReason}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{row.approvedBy || "Security"}</td>
                      <td className="py-3 px-4 text-right">
                        {!row.inTime && (
                          <button
                            onClick={() =>
                              setPunchOutModal({
                                open: true,
                                type: "staff",
                                id: row.id,
                                name: row.staffName,
                                outTime: getCurrentFormattedTime(),
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                          >
                            Mark Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ----------------- TAB 4: GOODS AND MATERIAL INWARD DETAILS ----------------- */}
        {activeTab === "inward" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4 w-14">Sr. No.</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Party Name</th>
                  <th className="py-3 px-4">Invoice No./Challan No</th>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4">Material Name and Details</th>
                  <th className="py-3 px-4">In time</th>
                  <th className="py-3 px-4">Out Time</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Vehicle No.</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {inwardList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      No material inward entries recorded.
                    </td>
                  </tr>
                ) : (
                  inwardList.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-400">{row.srNo || idx + 1}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(row.date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{row.partyName}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">{row.invoiceChallanNo}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {row.invoiceDate ? formatDate(row.invoiceDate) : "-"}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate" title={row.materialName}>
                        {row.materialName}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-emerald-700">{row.inTime}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{row.outTime || "-"}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {row.amount ? `₹${Number(row.amount).toLocaleString("en-IN")}` : "-"}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 uppercase">{row.vehicleNo}</td>
                      <td className="py-3 px-4 text-right">
                        {!row.outTime && (
                          <button
                            onClick={() =>
                              setPunchOutModal({
                                open: true,
                                type: "inward",
                                id: row.id,
                                name: `${row.partyName} (${row.vehicleNo})`,
                                outTime: getCurrentFormattedTime(),
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                          >
                            Mark Exited
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ----------------- TAB 5: GOODS AND MATERIAL OUTWARD / DISPATCH DETAILS ----------------- */}
        {activeTab === "outward" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4 w-14">Sr. No.</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Party Name</th>
                  <th className="py-3 px-4">Invoice No</th>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4">Material Name and Details</th>
                  <th className="py-3 px-4">In time</th>
                  <th className="py-3 px-4">Out Time</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Vehicle No.</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {outwardList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      No material outward/dispatch records found.
                    </td>
                  </tr>
                ) : (
                  outwardList.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-400">{row.srNo || idx + 1}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(row.date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{row.partyName}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">{row.invoiceNo}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {row.invoiceDate ? formatDate(row.invoiceDate) : "-"}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate" title={row.materialName}>
                        {row.materialName}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-cyan-700">{row.inTime}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{row.outTime || "-"}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {row.amount ? `₹${Number(row.amount).toLocaleString("en-IN")}` : "-"}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 uppercase">{row.vehicleNo}</td>
                      <td className="py-3 px-4 text-right">
                        {!row.outTime && (
                          <button
                            onClick={() =>
                              setPunchOutModal({
                                open: true,
                                type: "outward",
                                id: row.id,
                                name: `${row.partyName} (${row.vehicleNo})`,
                                outTime: getCurrentFormattedTime(),
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition cursor-pointer"
                          >
                            Mark Exited
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ----------------- CREATION MODAL ----------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-fuchsia-600" />
                  {activeTab === "attendance" && "Record Attendance Entry (Permanent & Contract)"}
                  {activeTab === "visitors" && "Record Visitor's Register Entry"}
                  {activeTab === "staff" && "Record Staff In / Out Gate Pass"}
                  {activeTab === "inward" && "Log Goods and Material Inward Entry"}
                  {activeTab === "outward" && "Log Goods and Material Outward / Dispatch"}
                </h3>
                <p className="text-xs text-slate-500">Security Gate & HR official digital register</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Form fields for ATTENDANCE */}
              {activeTab === "attendance" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Emp Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. DC-W01 or JAL-102"
                        value={formData.empCode || ""}
                        onChange={(e) => setFormData({ ...formData, empCode: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 uppercase font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Worker Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Patel"
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Worker Type</label>
                      <select
                        value={formData.category || "PERMANENT"}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      >
                        <option value="PERMANENT">Permanent Staff / Worker</option>
                        <option value="CONTRACT_JALARAM">Contract - Jalaram</option>
                        <option value="CONTRACT_YOGITA">Contract - Yogita</option>
                        <option value="CONTRACT_OTHER">Other Contract Agency</option>
                      </select>
                    </div>

                    {formData.category === "CONTRACT_OTHER" && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Contractor Name</label>
                        <input
                          type="text"
                          placeholder="Agency Name"
                          value={formData.contractorName || ""}
                          onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">In Time *</label>
                      <input
                        type="text"
                        required
                        placeholder="08:30 AM"
                        value={formData.inTime || ""}
                        onChange={(e) => setFormData({ ...formData, inTime: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Out Time</label>
                      <input
                        type="text"
                        placeholder="05:30 PM (optional)"
                        value={formData.outTime || ""}
                        onChange={(e) => setFormData({ ...formData, outTime: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">OT Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="0.0"
                        value={formData.otHours || "0"}
                        onChange={(e) => setFormData({ ...formData, otHours: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                    <input
                      type="text"
                      placeholder="e.g. Day Shift / Reactor Cleaning / Shift A"
                      value={formData.remarks || ""}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </div>
                </>
              )}

              {/* Form fields for VISITORS */}
              {activeTab === "visitors" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Visitor Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Pravin K. Parekh"
                        value={formData.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Related Person / To Meet *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rajesh Mehta (Purchase)"
                        value={formData.relatedPerson || ""}
                        onChange={(e) => setFormData({ ...formData, relatedPerson: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile No. *</label>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit mobile number"
                        value={formData.mobileNo || ""}
                        onChange={(e) => setFormData({ ...formData, mobileNo: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Visiting From</label>
                      <input
                        type="text"
                        placeholder="e.g. Gujarat Chemical Solvents Ltd"
                        value={formData.company || ""}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">In Time *</label>
                      <input
                        type="text"
                        required
                        placeholder="09:45 AM"
                        value={formData.inTime || ""}
                        onChange={(e) => setFormData({ ...formData, inTime: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle No.</label>
                      <input
                        type="text"
                        placeholder="e.g. GJ-06-KL-7721"
                        value={formData.vehicleNo || ""}
                        onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 uppercase font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Badge / Pass No.</label>
                      <input
                        type="text"
                        placeholder="VIS-104"
                        value={formData.badgeNo || ""}
                        onChange={(e) => setFormData({ ...formData, badgeNo: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose of Visit</label>
                    <input
                      type="text"
                      placeholder="e.g. Commercial review / Maintenance inspection / Audit"
                      value={formData.purpose || ""}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </div>
                </>
              )}

              {/* Form fields for STAFF IN / OUT */}
              {activeTab === "staff" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Manoj Joshi"
                        value={formData.staffName || ""}
                        onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                      <input
                        type="text"
                        placeholder="e.g. Manufacturing / QC / Accounts"
                        value={formData.department || ""}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Emp Code</label>
                      <input
                        type="text"
                        placeholder="DC-052"
                        value={formData.empCode || ""}
                        onChange={(e) => setFormData({ ...formData, empCode: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 uppercase font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Out Time *</label>
                      <input
                        type="text"
                        required
                        placeholder="02:30 PM"
                        value={formData.outTime || getCurrentFormattedTime()}
                        onChange={(e) => setFormData({ ...formData, outTime: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">In Time (if returned)</label>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={formData.inTime || ""}
                        onChange={(e) => setFormData({ ...formData, inTime: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Remark / Reason *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="e.g. Official: Emergency spare part procurement at Nandesari GIDC"
                      value={formData.remarkReason || ""}
                      onChange={(e) => setFormData({ ...formData, remarkReason: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Approved By</label>
                    <input
                      type="text"
                      placeholder="HOD / Plant Operations Head"
                      value={formData.approvedBy || ""}
                      onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </div>
                </>
              )}

              {/* Form fields for MATERIAL INWARD */}
              {activeTab === "inward" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Party Name (Supplier) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Reliance Industries Ltd"
                        value={formData.partyName || ""}
                        onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice / Challan No *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. RIL/CH-8821"
                        value={formData.invoiceChallanNo || ""}
                        onChange={(e) => setFormData({ ...formData, invoiceChallanNo: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date</label>
                      <input
                        type="date"
                        value={formData.invoiceDate || ""}
                        onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle No. *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. GJ-06-AX-4821"
                        value={formData.vehicleNo || ""}
                        onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 uppercase font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Material Name and Details *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Monochloroacetic Acid (MCA) 99.5% Pure"
                      value={formData.materialName || ""}
                      onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">In Time *</label>
                      <input
                        type="text"
                        required
                        placeholder="08:15 AM"
                        value={formData.inTime || ""}
                        onChange={(e) => setFormData({ ...formData, inTime: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Out Time</label>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={formData.outTime || ""}
                        onChange={(e) => setFormData({ ...formData, outTime: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        placeholder="385000"
                        value={formData.amount || ""}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Form fields for MATERIAL OUTWARD */}
              {activeTab === "outward" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Party Name (Customer) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sun Pharma Healthcare Ltd"
                        value={formData.partyName || ""}
                        onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice No *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. INV-2026-0034"
                        value={formData.invoiceNo || ""}
                        onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date</label>
                      <input
                        type="date"
                        value={formData.invoiceDate || ""}
                        onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle No. *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. GJ-01-TX-9988"
                        value={formData.vehicleNo || ""}
                        onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 uppercase font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Material Name and Details *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HPMC-P Pharmaceutical Grade 2208 (Lot #HPMC-26-001)"
                      value={formData.materialName || ""}
                      onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">In Time *</label>
                      <input
                        type="text"
                        required
                        placeholder="09:00 AM"
                        value={formData.inTime || ""}
                        onChange={(e) => setFormData({ ...formData, inTime: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Transporter</label>
                      <input
                        type="text"
                        placeholder="V-Trans India Ltd"
                        value={formData.transporter || ""}
                        onChange={(e) => setFormData({ ...formData, transporter: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        placeholder="875000"
                        value={formData.amount || ""}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-fuchsia-700 hover:bg-fuchsia-800 text-white text-xs h-9"
                >
                  {loading ? "Recording..." : "Save Entry to Register"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- QUICK PUNCH-OUT / MARK EXIT MODAL ----------------- */}
      {punchOutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-fuchsia-600" />
                Record Exit / Punch Out
              </h4>
              <button
                onClick={() => setPunchOutModal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Confirm departure/exit for <span className="font-semibold text-slate-900">{punchOutModal.name}</span>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Exit / Out Time</label>
              <input
                type="text"
                value={punchOutModal.outTime}
                onChange={(e) => setPunchOutModal({ ...punchOutModal, outTime: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPunchOutModal(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePunchOut}
                disabled={actionLoadingId !== null}
                className="bg-fuchsia-700 hover:bg-fuchsia-800 text-white text-xs"
              >
                {actionLoadingId ? "Saving..." : "Confirm Exit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
