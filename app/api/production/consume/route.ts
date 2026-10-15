import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { consumeBatchMaterial } from "@/server/services/production.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { batchId, materialId, lotId, quantity, unit, plannedQuantity } = body;

    if (!batchId || !materialId || !lotId || !quantity) {
      return NextResponse.json({ error: "Batch, material, lot, and quantity required" }, { status: 400 });
    }

    const consumption = await consumeBatchMaterial({
      batchId,
      materialId,
      lotId,
      quantity: Number(quantity),
      unit: unit || "KG",
      plannedQuantity: plannedQuantity ? Number(plannedQuantity) : undefined,
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
    });

    return NextResponse.json({ success: true, consumption });
  } catch (err: any) {
    console.error("Failed to consume batch material", err);
    return NextResponse.json({ error: err.message || "Failed to consume material" }, { status: 500 });
  }
}
