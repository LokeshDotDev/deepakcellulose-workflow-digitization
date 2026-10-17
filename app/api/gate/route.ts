import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateDocumentNumber } from "@/server/services/numbering.service";
import { logAuditEvent } from "@/server/services/audit.service";
import { GateEntryStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      supplierId,
      vehicleNumber,
      driverName,
      driverPhone,
      challanNumber,
      challanDate,
      purchaseOrderId,
      declaredMaterials,
      declaredQuantity,
      declaredUnit,
      numberOfPackages,
      weighbridgeGrossWeight,
      weighbridgeTareWeight,
      remarks,
    } = body;

    if (!supplierId || !vehicleNumber || !driverName || !challanNumber) {
      return NextResponse.json({ error: "Supplier, vehicle, driver, and challan number required" }, { status: 400 });
    }

    const gatePassNumber = await generateDocumentNumber("GATE_ENTRY");

    let netWeight: number | null = null;
    if (weighbridgeGrossWeight && weighbridgeTareWeight) {
      netWeight = Number(weighbridgeGrossWeight) - Number(weighbridgeTareWeight);
    }

    const gateEntry = await prisma.gateEntry.create({
      data: {
        gatePassNumber,
        arrivalTime: new Date(),
        supplierId,
        vehicleNumber,
        driverName,
        driverPhone,
        challanNumber,
        challanDate: challanDate ? new Date(challanDate) : new Date(),
        purchaseOrderId: purchaseOrderId || null,
        declaredMaterials,
        declaredQuantity: declaredQuantity ? Number(declaredQuantity) : null,
        declaredUnit: declaredUnit || "KG",
        numberOfPackages: numberOfPackages ? Number(numberOfPackages) : null,
        weighbridgeGrossWeight: weighbridgeGrossWeight ? Number(weighbridgeGrossWeight) : null,
        weighbridgeTareWeight: weighbridgeTareWeight ? Number(weighbridgeTareWeight) : null,
        weighbridgeNetWeight: netWeight,
        securityOfficerId: user.id,
        status: GateEntryStatus.RECORDED, // Vehicle registered inside plant / yard
        remarks,
      },
      include: { supplier: true, purchaseOrder: true },
    });

    await logAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
      action: "CREATE_GATE_ENTRY",
      entityType: "GATE_ENTRY",
      entityId: gateEntry.id,
      documentNumber: gatePassNumber,
      details: {
        vehicleNumber,
        driverName,
        netWeight,
        challanNumber,
      },
    });

    return NextResponse.json({ success: true, gateEntry });
  } catch (err: any) {
    console.error("Failed to create gate entry", err);
    return NextResponse.json({ error: err.message || "Failed to create gate entry" }, { status: 500 });
  }
}
