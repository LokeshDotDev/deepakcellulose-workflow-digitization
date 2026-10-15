import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: any, currency = "INR"): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return "₹0.00";
  const num = Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatQuantity(amount: any, unit?: string, precision = 2): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return `0 ${unit || ""}`.trim();
  const num = Number(amount);
  const formatted = num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatDate(date: string | Date | null | undefined, includeTime = false): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  
  if (includeTime) {
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getStatusBadgeVariant(status: string): { bg: string; text: string; border: string } {
  const s = status.toUpperCase();
  if (["APPROVED", "COMPLETED", "RELEASED", "AVAILABLE", "QC_APPROVED", "MATCHED", "PAID"].includes(s)) {
    return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
  }
  if (["PENDING", "IN_PROGRESS", "IN_TESTING", "PROCESSING", "ALLOCATED", "SUBMITTED", "RECEIVED_PENDING_QC", "RECORDED"].includes(s)) {
    return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
  }
  if (["REJECTED", "CANCELLED", "BLOCKED", "QUARANTINED", "QUARANTINE_HOLD", "DISCREPANCY", "CRITICAL"].includes(s)) {
    return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
  }
  if (["DRAFT", "PLANNED", "SCHEDULED"].includes(s)) {
    return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" };
  }
  return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
}
