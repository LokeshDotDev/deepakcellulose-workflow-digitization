"use client";

import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButton({ data, filename, title }: { data: any[]; filename: string; title: string }) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert("No data available to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(","));

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header];
        const escaped = ("" + (val ?? "")).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    }

    const csvData = csvRows.join("\n");
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
      <Download className="w-3.5 h-3.5" />
      Export {title} (CSV)
    </Button>
  );
}
