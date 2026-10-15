"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Shield,
  Warehouse,
  CheckCircle,
  Cog,
  Boxes,
  Truck,
  Receipt,
  FileSpreadsheet,
  History,
  Sliders,
  GitBranch,
  Network,
  Users,
  X,
} from "lucide-react";
import { SessionUser } from "@/lib/auth";

interface AppSidebarProps {
  user: SessionUser | null;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AppSidebar({ user, mobileOpen, onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname();

  const navSections = [
    {
      title: "OVERVIEW",
      items: [
        { label: "Management Dashboard", href: "/", icon: LayoutDashboard },
        { label: "Batch Traceability", href: "/traceability", icon: Network, highlight: true },
      ],
    },
    {
      title: "INBOUND & PROCUREMENT",
      items: [
        { label: "Procurement & POs", href: "/procurement", icon: ShoppingCart },
        { label: "Security Gate Entry", href: "/gate", icon: Shield },
        { label: "RM Warehouse & GRN", href: "/warehouse", icon: Warehouse },
      ],
    },
    {
      title: "QUALITY & ASSURANCE",
      items: [
        { label: "Quality Control (QC/QA)", href: "/qc", icon: CheckCircle },
      ],
    },
    {
      title: "MANUFACTURING & STORAGE",
      items: [
        { label: "Production & BMR", href: "/production", icon: Cog },
        { label: "Finished Goods Store", href: "/finished-goods", icon: Boxes },
      ],
    },
    {
      title: "OUTBOUND & COMMERCIAL",
      items: [
        { label: "Orders & Dispatch", href: "/dispatch", icon: Truck },
        { label: "Accounts & 3-Way Match", href: "/accounts", icon: Receipt },
      ],
    },
    {
      title: "SYSTEM GOVERNANCE",
      items: [
        { label: "Administration & Masters", href: "/admin", icon: Users },
        { label: "Dynamic Form Builder", href: "/admin/forms", icon: Sliders },
        { label: "Workflow Configurator", href: "/admin/workflows", icon: GitBranch },
        { label: "Reports & Exports", href: "/reports", icon: FileSpreadsheet },
        { label: "Audit Trail", href: "/audit", icon: History },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 lg:hidden">
          <div className="font-bold text-white text-sm">DEEPAK CELLULOSE ERP</div>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer group ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 transition ${
                        isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-white"
                      }`}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.highlight && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span>v1.0 • App Router</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live DB
          </span>
        </div>
      </aside>
    </>
  );
}
