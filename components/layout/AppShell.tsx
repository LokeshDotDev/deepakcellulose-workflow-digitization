"use client";

import React, { useState } from "react";
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

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
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
      <div className="flex-1 flex overflow-hidden">
        <AppSidebar
          user={user}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
