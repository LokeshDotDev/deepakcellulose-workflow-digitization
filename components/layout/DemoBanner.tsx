"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserCheck, ChevronDown, Check } from "lucide-react";

interface DemoBannerProps {
  currentEmail?: string;
  currentRole?: string;
  currentDept?: string;
}

const DEMO_PROFILES = [
  { email: "admin@deepakcellulose.com", role: "Super Admin", dept: "Admin", name: "Priya Shah (Super Admin)", color: "bg-purple-600" },
  { email: "purchase@deepakcellulose.com", role: "Purchase Manager", dept: "Purchase", name: "Rajesh Mehta (Procurement)", color: "bg-blue-600" },
  { email: "gate@deepakcellulose.com", role: "Gate Operator", dept: "Security Gate", name: "Vikram Singh (Gate Security)", color: "bg-amber-600" },
  { email: "warehouse@deepakcellulose.com", role: "Warehouse Manager", dept: "Warehouse", name: "Anil Sharma (RM Stores)", color: "bg-emerald-600" },
  { email: "qc@deepakcellulose.com", role: "QC Manager", dept: "QC/QA", name: "Dr. Sunita Patel (QC / QA)", color: "bg-rose-600" },
  { email: "production@deepakcellulose.com", role: "Production Manager", dept: "Production", name: "Manoj Joshi (Manufacturing)", color: "bg-indigo-600" },
  { email: "fg@deepakcellulose.com", role: "FG Manager", dept: "Finished Goods", name: "Sanjay Verma (FG Store)", color: "bg-teal-600" },
  { email: "dispatch@deepakcellulose.com", role: "Dispatch Manager", dept: "Dispatch", name: "Amit Dave (Dispatch Logistics)", color: "bg-cyan-600" },
  { email: "accounts@deepakcellulose.com", role: "Accounts Manager", dept: "Accounts", name: "Rakesh Trivedi (Finance & 3-Way Match)", color: "bg-orange-600" },
  { email: "management@deepakcellulose.com", role: "Management Viewer", dept: "Management", name: "Deepak Parikh (Director)", color: "bg-slate-700" },
];

export function DemoBanner({ currentEmail, currentRole, currentDept }: DemoBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const router = useRouter();

  const handleSwitch = async (email: string) => {
    try {
      setLoadingEmail(email);
      const res = await fetch("/api/auth/switch-demo-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to switch user", err);
    } finally {
      setLoadingEmail(null);
      setIsOpen(false);
    }
  };

  const activeProfile = DEMO_PROFILES.find((p) => p.email === currentEmail) || DEMO_PROFILES[0];

  return (
    <div className="bg-slate-100 border-b border-slate-200 text-slate-700 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-bold text-slate-800 tracking-wide text-[11px]">ACTIVE ROLE TESTING MODE</span>
        <span className="hidden md:inline text-slate-500 text-[11px]">• Switch personas below to test role-scoped UI & permissions</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-500 hidden sm:inline text-[11px]">Active Persona:</span>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-medium transition cursor-pointer text-slate-800 shadow-2xs text-xs"
          >
            <span className={`w-2 h-2 rounded-full ${activeProfile.color}`} />
            <span className="font-semibold">{activeProfile.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Select Department Persona
              </div>
              <div className="max-h-80 overflow-y-auto py-1">
                {DEMO_PROFILES.map((p) => {
                  const isCurrent = p.email === currentEmail;
                  return (
                    <button
                      key={p.email}
                      onClick={() => handleSwitch(p.email)}
                      disabled={loadingEmail !== null}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${p.color}`} />
                        <div>
                          <div className="font-medium text-slate-900">{p.name}</div>
                          <div className="text-[10px] text-slate-500">{p.dept} • {p.role}</div>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
