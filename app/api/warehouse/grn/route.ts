import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createGoodsReceipt } from "@/server/services/warehouse.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      gateEntryId,
      purchaseOrderId,
      supplierId,
      supplierChallanNumber,
      challanDate,
      warehouseId,
      locationId,
      remarks,
      lines,
    } = body;

    if (!supplierId || !supplierChallanNumber || !warehouseId || !lines || lines.length === 0) {
      return NextResponse.json({ error: "Missing required GRN header or line fields" }, { status: 400 });
    }

    const grn = await createGoodsReceipt({
      gateEntryId,
      purchaseOrderId,
      supplierId,
      supplierChallanNumber,
      challanDate: challanDate ? new Date(challanDate) : new Date(),
      warehouseId,
      locationId,
      remarks,
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
      lines,
    });

    return NextResponse.json({ success: true, grn });
  } catch (err: any) {
    console.error("Failed to create GRN", err);
    return NextResponse.json({ error: err.message || "Failed to create GRN" }, { status: 500 });
  }
}
