import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { canRecordRegistry, getAttendanceList, createAttendanceEntry } from "@/server/services/hr-registry.service";
import { WorkerCategory } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized access to Attendance Register" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;

    const data = await getAttendanceList({ date, category, search });
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error("Error fetching attendance list:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized. Security Gate, HR or Admin role required." }, { status: 403 });
    }

    const body = await req.json();
    const { empCode, name, category, contractorName, inTime, outTime, otHours, remarks, date, srNo } = body;

    if (!empCode || !name || !inTime) {
      return NextResponse.json({ error: "Employee Code, Name, and In-Time are required." }, { status: 400 });
    }

    const entry = await createAttendanceEntry(
      {
        srNo: srNo ? Number(srNo) : undefined,
        date,
        empCode,
        name,
        category: category as WorkerCategory,
        contractorName,
        inTime,
        outTime,
        otHours: otHours !== undefined ? Number(otHours) : 0,
        remarks,
      },
      user
    );

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating attendance entry:", err);
    return NextResponse.json({ error: err.message || "Failed to create attendance entry" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, outTime, otHours, remarks } = body;

    if (!id) {
      return NextResponse.json({ error: "Record ID is required." }, { status: 400 });
    }

    const updated = await prisma.attendanceRegister.update({
      where: { id },
      data: {
        outTime: outTime !== undefined ? outTime : undefined,
        otHours: otHours !== undefined ? Number(otHours) : undefined,
        remarks: remarks !== undefined ? remarks : undefined,
      },
    });

    return NextResponse.json({ success: true, entry: updated });
  } catch (err: any) {
    console.error("Error updating attendance entry:", err);
    return NextResponse.json({ error: err.message || "Failed to update attendance" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.attendanceRegister.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting attendance entry:", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
