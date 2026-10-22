import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { canRecordRegistry, getMaterialInwardList, createMaterialInwardEntry } from "@/server/services/hr-registry.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized access to Material Inward Register" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const data = await getMaterialInwardList({ date, status, search });
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error("Error fetching material inward list:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch material inward" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized. Security Gate, HR or Admin role required." }, { status: 403 });
    }

    const body = await req.json();
    const { partyName, invoiceChallanNo, invoiceDate, materialName, inTime, outTime, amount, vehicleNo, quantity, remarks, date, srNo } = body;

    if (!partyName || !invoiceChallanNo || !materialName || !vehicleNo || !inTime) {
      return NextResponse.json({ error: "Party Name, Invoice/Challan No, Material Name, In-Time, and Vehicle No are required." }, { status: 400 });
    }

    const entry = await createMaterialInwardEntry(
      {
        srNo: srNo ? Number(srNo) : undefined,
        date,
        partyName,
        invoiceChallanNo,
        invoiceDate,
        materialName,
        inTime,
        outTime,
        amount: amount !== undefined && amount !== "" ? Number(amount) : undefined,
        vehicleNo,
        quantity,
        remarks,
      },
      user
    );

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating material inward entry:", err);
    return NextResponse.json({ error: err.message || "Failed to create material inward entry" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canRecordRegistry(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, outTime, status, remarks, amount } = body;

    if (!id) {
      return NextResponse.json({ error: "Record ID is required." }, { status: 400 });
    }

    const updated = await prisma.materialInwardRegister.update({
      where: { id },
      data: {
        outTime: outTime !== undefined ? outTime : undefined,
        status: status || (outTime ? "UNLOADED" : undefined),
        amount: amount !== undefined && amount !== "" ? Number(amount) : undefined,
        remarks: remarks !== undefined ? remarks : undefined,
      },
    });

    return NextResponse.json({ success: true, entry: updated });
  } catch (err: any) {
    console.error("Error updating material inward:", err);
    return NextResponse.json({ error: err.message || "Failed to update material inward" }, { status: 500 });
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

    await prisma.materialInwardRegister.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting material inward entry:", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
