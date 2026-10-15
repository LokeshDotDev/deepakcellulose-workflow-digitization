import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createDispatchChallan } from "@/server/services/dispatch.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      customerOrderId,
      transporterName,
      vehicleNumber,
      driverName,
      driverPhone,
      lrNumber,
      totalPackages,
      netWeight,
      grossWeight,
      remarks,
      allocations,
    } = body;

    if (!customerOrderId || !allocations || allocations.length === 0) {
      return NextResponse.json({ error: "Customer order and at least one lot allocation required" }, { status: 400 });
    }

    const dispatch = await createDispatchChallan({
      customerOrderId,
      transporterName,
      vehicleNumber,
      driverName,
      driverPhone,
      lrNumber,
      totalPackages: totalPackages ? Number(totalPackages) : undefined,
      netWeight: netWeight ? Number(netWeight) : undefined,
      grossWeight: grossWeight ? Number(grossWeight) : undefined,
      remarks,
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
      allocations,
    });

    return NextResponse.json({ success: true, dispatch });
  } catch (err: any) {
    console.error("Failed to create dispatch challan", err);
    return NextResponse.json({ error: err.message || "Failed to create dispatch challan" }, { status: 500 });
  }
}
