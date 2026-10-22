import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { canRecordRegistry, getVisitorList, createVisitorEntry } from "@/server/services/hr-registry.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized access to Visitor Register" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const data = await getVisitorList({ date, status, search });
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error("Error fetching visitor list:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch visitors" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized. Security Gate, HR or Admin role required." }, { status: 403 });
    }

    const body = await req.json();
    const { name, relatedPerson, inTime, outTime, mobileNo, company, purpose, vehicleNo, badgeNo, signature, remarks, date, srNo } = body;

    if (!name || !relatedPerson || !inTime || !mobileNo) {
      return NextResponse.json({ error: "Name, Person to Meet, In-Time, and Mobile No are required." }, { status: 400 });
    }

    const entry = await createVisitorEntry(
      {
        srNo: srNo ? Number(srNo) : undefined,
        date,
        name,
        relatedPerson,
        inTime,
        outTime,
        mobileNo,
        company,
        purpose,
        vehicleNo,
        badgeNo,
        signature,
        remarks,
      },
      user
    );

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating visitor entry:", err);
    return NextResponse.json({ error: err.message || "Failed to create visitor entry" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, outTime, status, remarks, signature } = body;

    if (!id) {
      return NextResponse.json({ error: "Record ID is required." }, { status: 400 });
    }

    const updated = await prisma.visitorRegister.update({
      where: { id },
      data: {
        outTime: outTime !== undefined ? outTime : undefined,
        status: status || (outTime ? "DEPARTED" : undefined),
        remarks: remarks !== undefined ? remarks : undefined,
        signature: signature !== undefined ? signature : undefined,
      },
    });

    return NextResponse.json({ success: true, entry: updated });
  } catch (err: any) {
    console.error("Error updating visitor entry:", err);
    return NextResponse.json({ error: err.message || "Failed to update visitor" }, { status: 500 });
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

    await prisma.visitorRegister.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting visitor entry:", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
