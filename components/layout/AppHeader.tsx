"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Bell, Factory, Menu, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { SessionUser } from "@/lib/auth";

interface AppHeaderProps {
  user: SessionUser | null;
  notifications?: any[];
  onToggleMobileSidebar?: () => void;
}

export function AppHeader({ user, notifications = [], onToggleMobileSidebar }: AppHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/90 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
              <Factory className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                DEEPAK CELLULOSE
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  ERP
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Digital Operations & Manufacturing</div>
            </div>
          </Link>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search PO, Lot, Batch, Customer, Supplier...</span>
            </span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-500 shadow-2xs">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications Popover */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 relative cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-900">Department Notifications</span>
                  <span className="text-[11px] font-medium text-slate-500">{unreadCount} pending</span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">No active alerts</div>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.link || "#"}
                        onClick={() => setNotifOpen(false)}
                        className="p-3 text-xs flex gap-2.5 hover:bg-slate-50 transition block"
                      >
                        {n.type === "ACTION_REQUIRED" ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        ) : n.type === "SUCCESS" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 text-[11px]">{n.title}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                {user.fullName.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-900 leading-tight">{user.fullName}</div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  {user.departmentName || "System Administration"}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
