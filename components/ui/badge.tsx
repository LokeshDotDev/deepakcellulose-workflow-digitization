import * as React from "react";
import { cn, getStatusBadgeVariant } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
}

export function Badge({ className, status, variant, children, ...props }: BadgeProps) {
  if (status) {
    const { bg, text, border } = getStatusBadgeVariant(status);
    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase",
          bg,
          text,
          border,
          className
        )}
        {...props}
      >
        <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
        {children || status.replace(/_/g, " ")}
      </span>
    );
  }

  const variants = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    outline: "border-slate-300 text-slate-700 bg-transparent",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        variants[variant || "default"],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
