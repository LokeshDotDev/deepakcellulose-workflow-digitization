import type { Metadata } from "next";
import "./globals.css";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Deepak Cellulose Pvt. Ltd. — Manufacturing ERP & Digital Operations",
  description: "End-to-End Enterprise Operations Management: Procurement, Gate, Warehouse, QC/QA, Production BMR, Finished Goods, Dispatch & Commercial Reconciliation.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  let notifications: any[] = [];
  if (user) {
    try {
      notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 8,
      });
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  }

  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 antialiased overflow-hidden">
        <AppShell user={user} notifications={notifications}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
