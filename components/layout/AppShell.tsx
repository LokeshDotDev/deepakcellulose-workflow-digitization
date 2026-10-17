"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { DemoBanner } from "./DemoBanner";
import { SessionUser } from "@/lib/auth";

interface AppShellProps {
  user: SessionUser | null;
  notifications?: any[];
  children: React.ReactNode;
}

export function AppShell({ user, notifications = [], children }: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isAuthPage) {
    return (
      <div className="h-screen w-screen overflow-y-auto bg-slate-50/70 text-slate-900 flex flex-col font-sans">
        <DemoBanner
          currentEmail={user?.email}
          currentRole={user?.roles?.[0]}
          currentDept={user?.departmentName || undefined}
        />
        <main className="flex-1 flex items-center justify-center p-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans overflow-hidden">
      <DemoBanner
        currentEmail={user?.email}
        currentRole={user?.roles?.[0]}
        currentDept={user?.departmentName || undefined}
      />
      <AppHeader
        user={user}
        notifications={notifications}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <AppSidebar
          user={user}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
        <main className="flex-1 min-w-0 h-full overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full pb-16">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
