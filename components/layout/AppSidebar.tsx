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
  Lock,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { SessionUser } from "@/lib/auth";

interface AppSidebarProps {
  user: SessionUser | null;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: any;
  highlight?: boolean;
  requiredRoles?: string[];
  requiredPermPrefix?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AppSidebar({ user, mobileOpen, onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname();

  const userRoles = user?.roles || [];
  const isSuperAdmin = userRoles.includes("SUPER_ADMIN") || userRoles.includes("ADMIN");

  const rawNavSections: NavSection[] = [
    {
      title: "OVERVIEW",
      items: [
        { label: "Management Dashboard", href: "/", icon: LayoutDashboard },
        {
          label: "Batch Traceability",
          href: "/traceability",
          icon: Network,
          highlight: true,
          requiredRoles: [
            "SUPER_ADMIN",
            "ADMIN",
            "QA_MANAGER",
            "QC_MANAGER",
            "QC_ANALYST",
            "PRODUCTION_MANAGER",
            "PRODUCTION_SUPERVISOR",
            "WAREHOUSE_MANAGER",
            "MANAGEMENT_VIEWER",
          ],
        },
      ],
    },
    {
      title: "INBOUND & PROCUREMENT",
      items: [
        {
          label: "Procurement & POs",
          href: "/procurement",
          icon: ShoppingCart,
          requiredRoles: ["SUPER_ADMIN", "ADMIN", "PURCHASE_MANAGER", "PURCHASE_OFFICER"],
          requiredPermPrefix: "PURCHASE",
        },
        {
          label: "Security Gate Entry",
          href: "/gate",
          icon: Shield,
          requiredRoles: ["SUPER_ADMIN", "ADMIN", "GATE_OPERATOR", "SECURITY_OFFICER", "WAREHOUSE_MANAGER"],
          requiredPermPrefix: "GATE",
        },
        {
          label: "RM Warehouse & GRN",
          href: "/warehouse",
          icon: Warehouse,
          requiredRoles: ["SUPER_ADMIN", "ADMIN", "WAREHOUSE_MANAGER", "STORES_OFFICER"],
          requiredPermPrefix: "WAREHOUSE",
        },
      ],
    },
    {
      title: "QUALITY & ASSURANCE",
      items: [
        {
          label: "Quality Control (QC/QA)",
          href: "/qc",
          icon: CheckCircle,
          requiredRoles: ["SUPER_ADMIN", "ADMIN", "QC_MANAGER", "QC_ANALYST", "QA_MANAGER", "QA_OFFICER"],
          requiredPermPrefix: "QC",
        },
      ],
    },
    {
      title: "MANUFACTURING & STORAGE",
      items: [
        {
          label: "Production & BMR",
          href: "/production",
          icon: Cog,
          requiredRoles: ["SUPER_ADMIN", "ADMIN", "PRODUCTION_MANAGER", "PRODUCTION_SUPERVISOR", "PLANT_OPERATOR"],
          requiredPermPrefix: "PRODUCTION",
        },
        {
          label: "Finished Goods Store",
          href: "/finished-goods",
          icon: Boxes,
          requiredRoles: ["SUPER_ADMIN", "ADMIN", "FG_MANAGER", "WAREHOUSE_MANAGER", "PRODUCTION_MANAGER"],
          requiredPermPrefix: "FINISHED_GOODS",
        },
      ],
    },
    {
      title: "OUTBOUND & COMMERCIAL",
      items: [
        {
          label: "Orders & Dispatch",
          href: "/dispatch",
          icon: Truck,
          requiredRoles: ["SUPER_ADMIN", "ADMIN", "DISPATCH_MANAGER", "DISPATCH_OFFICER", "SALES_EXECUTIVE"],
          requiredPermPrefix: "DISPATCH",
        },
        {
          label: "Accounts & 3-Way Match",
          href: "/accounts",
          icon: Receipt,
          requiredRoles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER", "ACCOUNTS_EXECUTIVE"],
          requiredPermPrefix: "ACCOUNTS",
        },
      ],
    },
    {
      title: "HR ADMIN",
      items: [
        {
          label: "HR & Gate Registries",
          href: "/hr-admin",
          icon: ClipboardList,
          highlight: true,
          requiredRoles: [
            "SUPER_ADMIN",
            "ADMIN",
            "HR_ADMIN",
            "HR_MANAGER",
            "GATE_OPERATOR",
            "SECURITY_OFFICER",
          ],
          requiredPermPrefix: "HR",
        },
      ],
    },
    {
      title: "DAILY CLEANING",
      items: [
        {
          label: "Daily Cleaning Building Record",
          href: "/daily-cleaning",
          icon: Sparkles,
          highlight: true,
          requiredRoles: [
            "SUPER_ADMIN",
            "ADMIN",
            "QA_MANAGER",
            "QA_OFFICER",
            "QC_MANAGER",
            "QC_INSPECTOR",
            "WAREHOUSE_MANAGER",
            "GATE_OPERATOR",
            "SECURITY_OFFICER",
            "PRODUCTION_MANAGER",
            "MANAGEMENT_VIEWER",
          ],
          requiredPermPrefix: "CLEANING",
        },
      ],
    },
    {
      title: "SYSTEM GOVERNANCE",
      items: [
        {
          label: "Administration & Users",
          href: "/admin",
          icon: Users,
          requiredRoles: ["SUPER_ADMIN", "ADMIN"],
        },
        {
          label: "Process Flow Templates",
          href: "/admin/process-templates",
          icon: Network,
          requiredRoles: ["SUPER_ADMIN", "ADMIN", "QA_MANAGER", "PRODUCTION_MANAGER"],
        },
        {
          label: "Dynamic Form Builder",
          href: "/admin/forms",
          icon: Sliders,
          requiredRoles: ["SUPER_ADMIN", "ADMIN"],
        },
        {
          label: "Workflow Configurator",
          href: "/admin/workflows",
          icon: GitBranch,
          requiredRoles: ["SUPER_ADMIN", "ADMIN"],
        },
        {
          label: "Reports & Exports",
          href: "/reports",
          icon: FileSpreadsheet,
          requiredRoles: ["SUPER_ADMIN", "ADMIN", "MANAGEMENT_VIEWER", "ACCOUNTS_MANAGER"],
        },
        {
          label: "Audit Trail",
          href: "/audit",
          icon: History,
          requiredRoles: ["SUPER_ADMIN", "ADMIN", "QA_MANAGER"],
        },
      ],
    },
  ];

  // Filter items based on user's assigned roles and permissions
  const navSections = rawNavSections
    .map((section) => {
      const filteredItems = section.items.filter((item) => {
        // If super admin, show everything
        if (isSuperAdmin) return true;

        // If no user, show only dashboard
        if (!user) return item.href === "/";

        // If no specific roles required, show item
        if (!item.requiredRoles && !item.requiredPermPrefix) return true;

        // Check if any user role matches required roles
        const hasRoleMatch = item.requiredRoles?.some((role) => userRoles.includes(role));
        if (hasRoleMatch) return true;

        // Check if custom permissions grant access
        if (item.requiredPermPrefix && user.permissions) {
          const hasPerm = user.permissions.some(
            (p) => p.startsWith(item.requiredPermPrefix!) || p === "*"
          );
          if (hasPerm) return true;
        }

        return false;
      });

      return {
        ...section,
        items: filteredItems,
      };
    })
    .filter((section) => section.items.length > 0);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container — Professional White Theme */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 shrink-0 bg-white text-slate-700 border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:relative lg:top-auto lg:bottom-auto lg:h-full lg:translate-x-0 shadow-xs ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 lg:hidden bg-white">
          <div className="font-bold text-slate-900 text-sm tracking-tight">DEEPAK CELLULOSE ERP</div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Post / Scoped Roles Pill */}
        {user && (
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="overflow-hidden">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Active Post & Scope
              </span>
              <div className="text-xs font-bold text-slate-800 truncate">
                {user.departmentName || "General Access"}
              </div>
            </div>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {user.roles.length} {user.roles.length === 1 ? "Role" : "Roles"}
            </span>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer group ${
                      isActive
                        ? "bg-blue-50 text-blue-700 shadow-2xs border-l-3 border-blue-600"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 transition ${
                        isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.highlight && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 text-[10px] text-slate-500 flex items-center justify-between">
          <span className="font-mono text-slate-500">v1.2 • Secure RBAC</span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Cloud DB
          </span>
        </div>
      </aside>
    </>
  );
}
