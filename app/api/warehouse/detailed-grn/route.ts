import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessWarehouseSop, getDetailedGrnList, createDetailedGrnEntry } from "@/server/services/warehouse-sop.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canAccessWarehouseSop(user)) {
      return NextResponse.json({ error: "Unauthorized access to Detailed GRN" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const data = await getDetailedGrnList({ date, status, search });
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error("Error fetching Detailed GRN:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch GRN" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canAccessWarehouseSop(user)) {
      return NextResponse.json({ error: "Unauthorized. Warehouse, Security Gate, or Admin required." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.supplierName || !body.materialName) {
      return NextResponse.json({ error: "Supplier Name and Material Name are required." }, { status: 400 });
    }

    const grn = await createDetailedGrnEntry(body, user);
    return NextResponse.json({ success: true, grn }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating Detailed GRN:", err);
    return NextResponse.json({ error: err.message || "Failed to create GRN" }, { status: 500 });
  }
}
