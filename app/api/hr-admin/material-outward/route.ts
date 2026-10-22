import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { canRecordRegistry, getMaterialOutwardList, createMaterialOutwardEntry } from "@/server/services/hr-registry.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized access to Material Outward Register" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const data = await getMaterialOutwardList({ date, status, search });
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error("Error fetching material outward list:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch material outward" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized. Security Gate, HR or Admin role required." }, { status: 403 });
    }

    const body = await req.json();
    const { partyName, invoiceNo, invoiceDate, materialName, inTime, outTime, amount, vehicleNo, transporter, quantity, remarks, date, srNo } = body;

    if (!partyName || !invoiceNo || !materialName || !vehicleNo || !inTime) {
      return NextResponse.json({ error: "Party Name, Invoice No, Material Name, In-Time, and Vehicle No are required." }, { status: 400 });
    }

    const entry = await createMaterialOutwardEntry(
      {
        srNo: srNo ? Number(srNo) : undefined,
        date,
        partyName,
        invoiceNo,
        invoiceDate,
        materialName,
        inTime,
        outTime,
        amount: amount !== undefined && amount !== "" ? Number(amount) : undefined,
        vehicleNo,
        transporter,
        quantity,
        remarks,
      },
      user
    );

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating material outward entry:", err);
    return NextResponse.json({ error: err.message || "Failed to create material outward entry" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, outTime, status, remarks, amount, transporter } = body;

    if (!id) {
      return NextResponse.json({ error: "Record ID is required." }, { status: 400 });
    }

    const updated = await prisma.materialOutwardRegister.update({
      where: { id },
      data: {
        outTime: outTime !== undefined ? outTime : undefined,
        status: status || (outTime ? "DISPATCHED" : undefined),
        amount: amount !== undefined && amount !== "" ? Number(amount) : undefined,
        transporter: transporter !== undefined ? transporter : undefined,
        remarks: remarks !== undefined ? remarks : undefined,
      },
    });

    return NextResponse.json({ success: true, entry: updated });
  } catch (err: any) {
    console.error("Error updating material outward:", err);
    return NextResponse.json({ error: err.message || "Failed to update material outward" }, { status: 500 });
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

    await prisma.materialOutwardRegister.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting material outward entry:", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
