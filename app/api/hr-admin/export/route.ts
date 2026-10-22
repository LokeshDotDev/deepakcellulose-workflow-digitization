import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { canRecordRegistry, generateCsvString } from "@/server/services/hr-registry.service";
import { formatDate } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const register = searchParams.get("register") || "attendance";
    const date = searchParams.get("date") || undefined;

    let csvContent = "";
    let filename = `register_${register}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (register === "attendance") {
      const records = await prisma.attendanceRegister.findMany({
        orderBy: [{ date: "desc" }, { srNo: "asc" }],
      });
      const headers = ["Sr. No.", "Emp Code", "Name", "In Time", "Out Time", "OT Hours", "Remarks"];
      const rows = records.map((r, i) => [
        r.srNo || i + 1,
        r.empCode,
        r.name,
        r.inTime,
        r.outTime || "-",
        r.otHours ? Number(r.otHours).toFixed(2) : "0.00",
        r.remarks || "",
      ]);
      csvContent = generateCsvString(headers, rows);
      filename = `Attendance_Register_Permanent_Contract_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (register === "visitors") {
      const records = await prisma.visitorRegister.findMany({
        orderBy: [{ date: "desc" }, { srNo: "asc" }],
      });
      const headers = ["Sr. No.", "Date", "Name", "Related Person/ To Meet", "In Time", "Out Time", "Mobile No.", "Signature"];
      const rows = records.map((r, i) => [
        r.srNo || i + 1,
        formatDate(r.date),
        r.name,
        r.relatedPerson,
        r.inTime,
        r.outTime || "-",
        r.mobileNo,
        r.signature || r.status || "VERIFIED",
      ]);
      csvContent = generateCsvString(headers, rows);
      filename = `Visitors_Register_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (register === "staff") {
      const records = await prisma.staffMovementRegister.findMany({
        orderBy: [{ date: "desc" }, { srNo: "asc" }],
      });
      const headers = ["Sr. No.", "Staff Name", "Date", "In Time", "Out Time", "Remark/ Reason"];
      const rows = records.map((r, i) => [
        r.srNo || i + 1,
        r.staffName,
        formatDate(r.date),
        r.inTime || "-",
        r.outTime || "-",
        r.remarkReason,
      ]);
      csvContent = generateCsvString(headers, rows);
      filename = `Staff_In_Out_Register_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (register === "inward") {
      const records = await prisma.materialInwardRegister.findMany({
        orderBy: [{ date: "desc" }, { srNo: "asc" }],
      });
      const headers = [
        "Sr. No.",
        "Date",
        "Party Name",
        "Invoice No./Challan No",
        "Invoice Date",
        "Material Name and Details",
        "In time",
        "Out Time",
        "Amonut",
        "Vehicle No.",
      ];
      const rows = records.map((r, i) => [
        r.srNo || i + 1,
        formatDate(r.date),
        r.partyName,
        r.invoiceChallanNo,
        r.invoiceDate ? formatDate(r.invoiceDate) : "-",
        r.materialName,
        r.inTime,
        r.outTime || "-",
        r.amount ? Number(r.amount).toFixed(2) : "-",
        r.vehicleNo,
      ]);
      csvContent = generateCsvString(headers, rows);
      filename = `Goods_Material_Inward_Register_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (register === "outward") {
      const records = await prisma.materialOutwardRegister.findMany({
        orderBy: [{ date: "desc" }, { srNo: "asc" }],
      });
      const headers = [
        "Sr. No.",
        "Date",
        "Party Name",
        "Invoice No",
        "Invoice Date",
        "Material Name and Details",
        "In time",
        "Out Time",
        "Amonut",
        "Vehicle No.",
      ];
      const rows = records.map((r, i) => [
        r.srNo || i + 1,
        formatDate(r.date),
        r.partyName,
        r.invoiceNo,
        r.invoiceDate ? formatDate(r.invoiceDate) : "-",
        r.materialName,
        r.inTime,
        r.outTime || "-",
        r.amount ? Number(r.amount).toFixed(2) : "-",
        r.vehicleNo,
      ]);
      csvContent = generateCsvString(headers, rows);
      filename = `Goods_Material_Outward_Register_${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      return NextResponse.json({ error: "Invalid register type" }, { status: 400 });
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Export error:", err);
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}
