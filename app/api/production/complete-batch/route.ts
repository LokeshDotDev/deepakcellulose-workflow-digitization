import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { receiveFinishedGoods } from "@/server/services/finished-goods.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { batchId, productId, producedQuantity, unit, packageCount, packagingTypeId, warehouseId } = body;

    if (!batchId || !productId || !producedQuantity || !packagingTypeId || !warehouseId) {
      return NextResponse.json({ error: "Missing required finished goods receipt fields" }, { status: 400 });
    }

    const result = await receiveFinishedGoods({
      batchId,
      productId,
      producedQuantity: Number(producedQuantity),
      unit: unit || "KG",
      packageCount: Number(packageCount || 40),
      packagingTypeId,
      warehouseId,
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("Failed to complete batch", err);
    return NextResponse.json({ error: err.message || "Failed to complete batch" }, { status: 500 });
  }
}
