import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { canRecordRegistry, getStaffMovementList, createStaffMovementEntry } from "@/server/services/hr-registry.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized access to Staff Register" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const data = await getStaffMovementList({ date, status, search });
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error("Error fetching staff movement list:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch staff movements" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized. Security Gate, HR or Admin role required." }, { status: 403 });
    }

    const body = await req.json();
    const { staffName, empCode, department, inTime, outTime, remarkReason, approvedBy, date, srNo } = body;

    if (!staffName || !remarkReason) {
      return NextResponse.json({ error: "Staff Name and Remark/Reason are required." }, { status: 400 });
    }

    const entry = await createStaffMovementEntry(
      {
        srNo: srNo ? Number(srNo) : undefined,
        staffName,
        empCode,
        department,
        date,
        inTime,
        outTime: outTime || new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
        remarkReason,
        approvedBy,
      },
      user
    );

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating staff movement entry:", err);
    return NextResponse.json({ error: err.message || "Failed to create staff movement entry" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, inTime, outTime, remarkReason, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Record ID is required." }, { status: 400 });
    }

    const updated = await prisma.staffMovementRegister.update({
      where: { id },
      data: {
        inTime: inTime !== undefined ? inTime : undefined,
        outTime: outTime !== undefined ? outTime : undefined,
        remarkReason: remarkReason !== undefined ? remarkReason : undefined,
        status: status || (inTime ? "RETURNED" : undefined),
      },
    });

    return NextResponse.json({ success: true, entry: updated });
  } catch (err: any) {
    console.error("Error updating staff movement:", err);
    return NextResponse.json({ error: err.message || "Failed to update staff movement" }, { status: 500 });
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

    await prisma.staffMovementRegister.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting staff movement:", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
