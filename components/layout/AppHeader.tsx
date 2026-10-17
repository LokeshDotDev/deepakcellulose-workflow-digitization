"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, Factory, Menu, CheckCircle2, AlertTriangle, Info, LogOut } from "lucide-react";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { SessionUser } from "@/lib/auth";

interface AppHeaderProps {
  user: SessionUser | null;
  notifications?: any[];
  onToggleMobileSidebar?: () => void;
}

export function AppHeader({ user, notifications = [], onToggleMobileSidebar }: AppHeaderProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUserMenuOpen(false);
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

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

          {/* User Profile Pill & Menu */}
          {user ? (
            <div className="relative pl-2 border-l border-slate-200">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {user.fullName.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">{user.fullName}</div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    {user.departmentName || "System Operations"}
                  </div>
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 px-4 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-3">
                  <div className="border-b border-slate-100 pb-2.5">
                    <div className="font-bold text-xs text-slate-900">{user.fullName}</div>
                    <div className="text-[11px] font-mono text-slate-500">{user.email}</div>
                    {user.employeeCode && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Emp ID: {user.employeeCode}</div>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Assigned Roles
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <span key={r} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {r.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>

                  {user.customPermissions && user.customPermissions.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Custom Extra Permissions
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {user.customPermissions.map((cp) => (
                          <span key={cp} className="px-2 py-0.5 rounded text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {cp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href="/admin/users"
                      onClick={() => setUserMenuOpen(false)}
                      className="text-[11px] text-slate-600 hover:text-blue-600 font-medium"
                    >
                      User Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </header>

      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
