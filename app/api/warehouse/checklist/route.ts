import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessWarehouseSop, getIncomingChecklists, createIncomingChecklist } from "@/server/services/warehouse-sop.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canAccessWarehouseSop(user)) {
      return NextResponse.json({ error: "Unauthorized access to Incoming RM Checklist" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const search = searchParams.get("search") || undefined;

    const data = await getIncomingChecklists({ date, search });
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error("Error fetching incoming checklist:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch checklist" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canAccessWarehouseSop(user)) {
      return NextResponse.json({ error: "Unauthorized. Warehouse, Security Gate, or Admin required." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.materialName || !body.supplierName || !body.vehicleNumber) {
      return NextResponse.json({ error: "Material Name, Supplier Name, and Vehicle Number are required." }, { status: 400 });
    }

    const checklist = await createIncomingChecklist(body, user);
    return NextResponse.json({ success: true, checklist }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating incoming checklist:", err);
    return NextResponse.json({ error: err.message || "Failed to create checklist" }, { status: 500 });
  }
}
