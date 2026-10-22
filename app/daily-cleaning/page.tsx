import React from "react";
import { getSession } from "@/lib/auth";
import { getDailyCleaningSheet } from "@/server/services/daily-cleaning.service";
import { DailyCleaningClient } from "@/components/cleaning/DailyCleaningClient";
import { Sparkles, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DailyCleaningPage() {
  const user = await getSession();

  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const sheetData = await getDailyCleaningSheet(currentMonthYear);

  return (
    <div className="space-y-6">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Daily Cleaning — Building Premises Record
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  F10P714QA02
                </span>
                <span>•</span>
                <span>Ref: P714QA02</span>
                <span>•</span>
                <span>Department: QA & Plant Maintenance</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Digitized log of daily cleaning across 15 plant zones (road, passage, ETP, tank farm, staircase, and terrace). Verified by QA and signed daily by cleaners and supervisors.
          </p>
        </div>
      </div>

      <DailyCleaningClient
        initialData={JSON.parse(JSON.stringify(sheetData))}
        currentUser={
          user
            ? {
                fullName: user.fullName,
                role: user.roles[0] || "User",
              }
            : undefined
        }
      />
    </div>
  );
}
