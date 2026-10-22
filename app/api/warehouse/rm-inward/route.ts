import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessWarehouseSop, getRmInwardRegisterList, createRmInwardRegisterEntry } from "@/server/services/warehouse-sop.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canAccessWarehouseSop(user)) {
      return NextResponse.json({ error: "Unauthorized access to RM Inward Register" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const search = searchParams.get("search") || undefined;

    const data = await getRmInwardRegisterList({ date, search });
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error("Error fetching RM Inward Register:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch register" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canAccessWarehouseSop(user)) {
      return NextResponse.json({ error: "Unauthorized. Warehouse, Security Gate, or Admin required." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.supplierName || !body.materialName || !body.quantity) {
      return NextResponse.json({ error: "Supplier Name, Material Name, and Quantity are required." }, { status: 400 });
    }

    const entry = await createRmInwardRegisterEntry(body, user);
    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating RM inward entry:", err);
    return NextResponse.json({ error: err.message || "Failed to create entry" }, { status: 500 });
  }
}
