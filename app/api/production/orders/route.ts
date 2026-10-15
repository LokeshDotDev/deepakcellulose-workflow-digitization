import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createProductionOrder, startBatchManufacturing } from "@/server/services/production.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, productId, formulaId, plannedQuantity, unit, priority, notes, productionOrderId } = body;

    if (action === "START_BATCH") {
      if (!productionOrderId) {
        return NextResponse.json({ error: "Production Order ID required" }, { status: 400 });
      }
      const batch = await startBatchManufacturing({
        productionOrderId,
        operatorId: user.id,
        actorId: user.id,
        actorEmail: user.email,
        actorName: user.fullName,
        notes,
      });
      return NextResponse.json({ success: true, batch });
    } else {
      if (!productId || !formulaId || !plannedQuantity) {
        return NextResponse.json({ error: "Product, formula, and planned quantity required" }, { status: 400 });
      }

      const order = await createProductionOrder({
        productId,
        formulaId,
        plannedQuantity: Number(plannedQuantity),
        unit: unit || "KG",
        priority: priority || "MEDIUM",
        assignedSupervisorId: user.id,
        notes,
        actorId: user.id,
        actorEmail: user.email,
        actorName: user.fullName,
      });

      return NextResponse.json({ success: true, order });
    }
  } catch (err: any) {
    console.error("Failed to process production order action", err);
    return NextResponse.json({ error: err.message || "Failed to process production order action" }, { status: 500 });
  }
}
