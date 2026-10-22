"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Plus,
  Printer,
  Download,
  Filter,
  Check,
  X,
  ShieldCheck,
  Building,
  RefreshCw,
  Clock,
  UserCheck,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CleaningArea {
  key: string;
  name: string;
  code: number;
}

interface DailyRecord {
  id: string;
  monthYear: string;
  dayOfMonth: number;
  date: string;
  securityCabinArea: boolean;
  etpArea: boolean;
  tankFarmArea: boolean;
  materialVehicleEntryArea: boolean;
  bldg1StaircaseTerrace: boolean;
  maintenanceRoomArea: boolean;
  roPlantArea: boolean;
  bldg2StaircaseTerrace: boolean;
  bldg34EastSideArea: boolean;
  bldg34WestSideArea: boolean;
  psychometricEvaporatorPassage: boolean;
  bldg34InBetweenArea: boolean;
  scrapYardArea: boolean;
  bldg3StaircaseTerrace: boolean;
  bldg4StaircaseTerrace: boolean;
  doneBy: string;
  checkedBy?: string | null;
  verifiedByQa?: string | null;
  remarks?: string | null;
  recordedBy?: { fullName: string };
  createdAt: string;
}

interface DailyCleaningClientProps {
  initialData: {
    records: DailyRecord[];
    monthYear: string;
    totalDaysInMonth: number;
    areas: readonly CleaningArea[];
    summary: {
      daysRecorded: number;
      completionRate: number;
    };
  };
  currentUser?: {
    fullName: string;
    role: string;
  };
}

export function DailyCleaningClient({
  initialData,
  currentUser,
}: DailyCleaningClientProps) {
  const [monthYear, setMonthYear] = useState(initialData.monthYear);
  const [records, setRecords] = useState<DailyRecord[]>(initialData.records);
  const [totalDays, setTotalDays] = useState(initialData.totalDaysInMonth);
  const [areas, setAreas] = useState<readonly CleaningArea[]>(initialData.areas);
  const [summary, setSummary] = useState(initialData.summary);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [doneBy, setDoneBy] = useState<string>("Hitesh");
  const [checkedBy, setCheckedBy] = useState<string>("Ajinath Thombare");
  const [verifiedByQa, setVerifiedByQa] = useState<string>("Sankarsana Patra");
  const [areaSelections, setAreaSelections] = useState<Record<string, boolean>>({});
  const [remarks, setRemarks] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Quick cleaner options from physical register
  const cleanerOptions = ["Hitesh", "Nitin", "Ramesh", "Mukesh", "Bharat"];

  // Mapping dayOfMonth -> record
  const dayRecordMap = React.useMemo(() => {
    const map = new Map<number, DailyRecord>();
    for (const r of records) {
      map.set(r.dayOfMonth, r);
    }
    return map;
  }, [records]);

  // Fetch sheet when monthYear changes
  const fetchMonthSheet = async (targetMonthYear: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/daily-cleaning?monthYear=${targetMonthYear}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
        setTotalDays(data.totalDaysInMonth);
        setAreas(data.areas);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to load cleaning sheet:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    setMonthYear(newMonth);
    fetchMonthSheet(newMonth);
  };

  const openLogModalForDay = (day: number) => {
    setSelectedDay(day);
    const existing = dayRecordMap.get(day);

    const initialAreas: Record<string, boolean> = {};
    areas.forEach((a) => {
      if (existing) {
        initialAreas[a.key] = (existing as any)[a.key] ?? true;
      } else {
        initialAreas[a.key] = true;
      }
    });

    setAreaSelections(initialAreas);
    setDoneBy(existing?.doneBy || "Hitesh");
    setCheckedBy(existing?.checkedBy || "Ajinath Thombare");
    setVerifiedByQa(existing?.verifiedByQa || "Sankarsana Patra");
    setRemarks(existing?.remarks || "");
    setIsLogModalOpen(true);
  };

  const toggleAllAreas = (val: boolean) => {
    const updated: Record<string, boolean> = {};
    areas.forEach((a) => {
      updated[a.key] = val;
    });
    setAreaSelections(updated);
  };

  const handleSaveDayRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doneBy.trim()) {
      alert("Please provide the Cleaner's Name (Done By).");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/daily-cleaning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthYear,
          dayOfMonth: selectedDay,
          doneBy: doneBy.trim(),
          checkedBy: checkedBy.trim(),
          verifiedByQa: verifiedByQa.trim(),
          remarks: remarks.trim() || undefined,
          areas: areaSelections,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to save record");
      }

      setIsLogModalOpen(false);
      await fetchMonthSheet(monthYear);
    } catch (err: any) {
      alert(err.message || "Failed to save daily cleaning record");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Format monthYear for display, e.g. "Oct 2026"
  const formattedMonth = React.useMemo(() => {
    try {
      const [y, m] = monthYear.split("-").map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    } catch {
      return monthYear;
    }
  }, [monthYear]);

  return (
    <div className="space-y-6">
      {/* Action Bar & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">Select Month:</span>
            <input
              type="month"
              value={monthYear}
              onChange={handleMonthChange}
              className="bg-transparent font-medium text-slate-900 border-none outline-hidden cursor-pointer"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMonthSheet(monthYear)}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print SOP Sheet
          </Button>

          <Button
            size="sm"
            onClick={() => openLogModalForDay(new Date().getDate())}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Log Today's Cleaning
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Month / Revision
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{formattedMonth}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Format No: F10P714QA02 (Rev 00)</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Days Recorded
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-1">
            {summary.daysRecorded} / {totalDays} Days
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
            {summary.completionRate}% of month logged
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Plant Areas Monitored
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">15 Dedicated Zones</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Roads, Passages, ETP, RO & Buildings</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            QA Verification
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">Verified (QA)</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Sankarsana Patra (Manager QA)</div>
        </div>
      </div>

      {/* Main Physical SOP Document Form Header & Matrix */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden print:border-none print:shadow-none">
        {/* SOP Standard Header */}
        <div className="border-b-2 border-slate-800 p-4 bg-slate-50/50">
          <div className="grid grid-cols-12 gap-2 text-xs border border-slate-800">
            {/* Logo / Company Box */}
            <div className="col-span-12 sm:col-span-8 p-3 border-b sm:border-b-0 sm:border-r border-slate-800 flex flex-col justify-center">
              <div className="font-extrabold text-sm sm:text-base tracking-wider text-slate-950 uppercase">
                DEEPAK CELLULOSE PRIVATE LIMITED
              </div>
              <div className="text-[11px] font-bold text-slate-700 mt-1 uppercase tracking-tight">
                FORMAT: DAILY CLEANING BUILDING RECORD - BUILDING PREMISES : Ref: P714QA02
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-600 font-semibold mt-1">
                <span>Department: <strong className="text-slate-900">QA</strong></span>
                <span>Supersedes No & date: <strong className="text-slate-900">----</strong></span>
                <span>Month: <strong className="text-slate-900 uppercase">{formattedMonth}</strong></span>
              </div>
            </div>

            {/* SOP Document Controls */}
            <div className="col-span-12 sm:col-span-4 p-2.5 flex flex-col justify-center text-[10px] space-y-1 bg-white">
              <div className="flex justify-between border-b border-slate-200 pb-0.5">
                <span className="text-slate-500 font-semibold">Format No.:</span>
                <span className="font-bold text-slate-900 font-mono">F10P714QA02</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-0.5">
                <span className="text-slate-500 font-semibold">Revision No.:</span>
                <span className="font-bold text-slate-900">00</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-0.5">
                <span className="text-slate-500 font-semibold">Effective Date:</span>
                <span className="font-medium text-slate-800">01/10/2025</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-0.5">
                <span className="text-slate-500 font-semibold">Review Date:</span>
                <span className="font-medium text-slate-800">30/09/2028</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Page:</span>
                <span className="font-bold text-slate-900">1 of 1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Matrix Sheet Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-300">
                <th className="py-2.5 px-2 border-r border-slate-300 w-12 text-center sticky left-0 bg-slate-100 z-20">
                  Sr. No.
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 min-w-[260px] sticky left-12 bg-slate-100 z-20 shadow-xs">
                  Date / Area Cleaning (Road, Passage)
                </th>

                {/* Day Columns */}
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                  const hasRecord = dayRecordMap.has(day);
                  const isToday =
                    new Date().getDate() === day &&
                    new Date().getMonth() + 1 === Number(monthYear.split("-")[1]);

                  return (
                    <th
                      key={day}
                      onClick={() => openLogModalForDay(day)}
                      title={`Click to log/edit cleaning for day ${day}`}
                      className={`py-2 px-1.5 border-r border-slate-300 text-center min-w-[42px] cursor-pointer hover:bg-emerald-50 transition select-none ${
                        isToday ? "bg-amber-100/70 text-amber-950 font-extrabold" : ""
                      }`}
                    >
                      <div className="font-mono text-[10px]">{day}</div>
                      <div className="text-[8px] text-slate-400 font-normal">
                        {monthYear.split("-")[1]}/{monthYear.split("-")[0].slice(2)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800">
              {areas.map((area) => (
                <tr key={area.key} className="hover:bg-slate-50/70 transition">
                  {/* Sr No */}
                  <td className="py-1.5 px-2 text-center font-semibold text-slate-600 border-r border-slate-200 sticky left-0 bg-white z-10">
                    {area.code}
                  </td>

                  {/* Area Description */}
                  <td className="py-1.5 px-3 font-medium text-slate-900 border-r border-slate-200 sticky left-12 bg-white z-10 shadow-xs">
                    {area.name}
                  </td>

                  {/* Days */}
                  {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                    const record = dayRecordMap.get(day);
                    const isPerformed = record ? (record as any)[area.key] : null;

                    return (
                      <td
                        key={day}
                        onClick={() => openLogModalForDay(day)}
                        className="py-1.5 px-1 text-center border-r border-slate-200 cursor-pointer hover:bg-emerald-50/50"
                      >
                        {isPerformed === true ? (
                          <span className="text-emerald-700 font-bold text-xs select-none">
                            ✓
                          </span>
                        ) : isPerformed === false ? (
                          <span className="text-rose-500 font-bold text-xs select-none">
                            ✕
                          </span>
                        ) : (
                          <span className="text-slate-200 text-[10px]">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Done By Row */}
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <td
                  colSpan={2}
                  className="py-2 px-3 text-right text-slate-800 border-r border-slate-300 sticky left-0 bg-slate-50 z-10"
                >
                  Done By:
                </td>
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                  const record = dayRecordMap.get(day);
                  return (
                    <td
                      key={day}
                      onClick={() => openLogModalForDay(day)}
                      title={record ? `Done by: ${record.doneBy}` : "Not logged"}
                      className="py-2 px-1 text-center border-r border-slate-200 font-mono text-[9px] text-slate-700 font-semibold truncate max-w-[42px] cursor-pointer hover:bg-emerald-50"
                    >
                      {record?.doneBy || "-"}
                    </td>
                  );
                })}
              </tr>

              {/* Checked By Row */}
              <tr className="bg-slate-50 font-bold">
                <td
                  colSpan={2}
                  className="py-2 px-3 text-right text-slate-800 border-r border-slate-300 sticky left-0 bg-slate-50 z-10"
                >
                  Checked By:
                </td>
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                  const record = dayRecordMap.get(day);
                  return (
                    <td
                      key={day}
                      onClick={() => openLogModalForDay(day)}
                      title={record?.checkedBy || "Pending supervisor sign"}
                      className="py-2 px-1 text-center border-r border-slate-200 font-mono text-[9px] text-emerald-800 font-semibold truncate max-w-[42px] cursor-pointer hover:bg-emerald-50"
                    >
                      {record?.checkedBy ? "Sign" : "-"}
                    </td>
                  );
                })}
              </tr>

              {/* Verified By QA Row */}
              <tr className="bg-emerald-50/50 font-bold border-t border-slate-200">
                <td
                  colSpan={2}
                  className="py-2 px-3 text-right text-emerald-950 border-r border-slate-300 sticky left-0 bg-emerald-50 z-10"
                >
                  Verified By (QA):
                </td>
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                  const record = dayRecordMap.get(day);
                  return (
                    <td
                      key={day}
                      onClick={() => openLogModalForDay(day)}
                      title={record?.verifiedByQa || "Pending QA stamp"}
                      className="py-2 px-1 text-center border-r border-slate-200 font-mono text-[9px] text-emerald-800 font-semibold truncate max-w-[42px] cursor-pointer hover:bg-emerald-100/50"
                    >
                      {record?.verifiedByQa ? "QA" : "-"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend / Standard Instruction */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-800">√ Tick</span> for cleaning performed
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-slate-500">
              Click any column day header or cell to log / review cleaning records
            </span>
          </div>
          <div className="font-semibold text-slate-700">
            Reference Document: SOP No. QA/SOP/014
          </div>
        </div>

        {/* Bottom Sign-off Box (Matching Image 1) */}
        <div className="border-t-2 border-slate-800 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 text-xs">
          {/* Prepared By */}
          <div className="p-3 bg-white space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Prepared By</div>
            <div className="font-bold text-slate-900 text-xs">Ashwin K. Patel</div>
            <div className="text-[11px] text-slate-600">(Executive QA)</div>
            <div className="pt-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
              <span>Sign: Ashwin</span>
              <span>Date: 30/09/2025</span>
            </div>
          </div>

          {/* Checked By */}
          <div className="p-3 bg-white space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Checked By</div>
            <div className="font-bold text-slate-900 text-xs">Ajinath Thombare</div>
            <div className="text-[11px] text-slate-600">(Sr. Manager Production)</div>
            <div className="pt-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
              <span>Sign: Ajinath</span>
              <span>Date: 01/10/2025</span>
            </div>
          </div>

          {/* Approved By */}
          <div className="p-3 bg-white space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Approved By</div>
            <div className="font-bold text-slate-900 text-xs">Sankarsana Patra</div>
            <div className="text-[11px] text-slate-600">(Manager QA)</div>
            <div className="pt-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
              <span>Sign: Sankarsana</span>
              <span>Date: 01/10/2025</span>
            </div>
          </div>
        </div>

        {/* Confidential footer bar */}
        <div className="bg-slate-900 text-white text-[10px] font-bold py-1.5 px-4 text-center tracking-widest uppercase">
          FOR RESTRICTED CIRCULATION ONLY • DEEPAK CELLULOSE PVT. LTD.
        </div>
      </div>

      {/* Log / Edit Day Cleaning Modal Dialog */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  Log Daily Building Cleaning — Day {selectedDay} ({formattedMonth})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Format No.: F10P714QA02 • Tick all areas cleaned today
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveDayRecord} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Day & Cleaner Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Day of Month
                  </label>
                  <select
                    value={selectedDay}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      setSelectedDay(d);
                      const rec = dayRecordMap.get(d);
                      if (rec) {
                        setDoneBy(rec.doneBy);
                        setCheckedBy(rec.checkedBy || "Ajinath Thombare");
                        setVerifiedByQa(rec.verifiedByQa || "Sankarsana Patra");
                      }
                    }}
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white"
                  >
                    {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Day {d} ({monthYear}-{String(d).padStart(2, "0")})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cleaner Name (Done By) *
                  </label>
                  <input
                    type="text"
                    list="cleaners-list"
                    value={doneBy}
                    onChange={(e) => setDoneBy(e.target.value)}
                    required
                    placeholder="e.g. Hitesh / Nitin"
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white"
                  />
                  <datalist id="cleaners-list">
                    {cleanerOptions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Checked By (Supervisor)
                  </label>
                  <input
                    type="text"
                    value={checkedBy}
                    onChange={(e) => setCheckedBy(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white"
                  />
                </div>
              </div>

              {/* Areas Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Cleaning Verification Checklist (15 Building Areas)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAllAreas(true)}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => toggleAllAreas(false)}
                      className="text-[11px] font-semibold text-slate-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-200 rounded-xl p-3 bg-white max-h-72 overflow-y-auto">
                  {areas.map((a) => {
                    const checked = areaSelections[a.key] ?? true;
                    return (
                      <label
                        key={a.key}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                          checked
                            ? "bg-emerald-50/70 border-emerald-300 text-slate-900 font-medium"
                            : "bg-slate-50/50 border-slate-200 text-slate-500"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setAreaSelections((prev) => ({
                              ...prev,
                              [a.key]: e.target.checked,
                            }))
                          }
                          className="mt-0.5 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[10px] text-slate-500">
                              #{a.code}
                            </span>
                            <span>{a.name}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* QA Sign-off & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Verified By (QA)
                  </label>
                  <input
                    type="text"
                    value={verifiedByQa}
                    onChange={(e) => setVerifiedByQa(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    QA sign/initial confirming physical spot check
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remarks / Any Discrepancy Observed
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional notes or weather condition..."
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white"
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsLogModalOpen(false)}
                  disabled={saving}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  {saving ? "Saving Record..." : "Confirm & Save Entry"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
