import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { authorizeMaterialDisposition } from "@/server/services/qc.service";
import { DispositionType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { inspectionId, disposition, reason, remarks } = body;

    if (!inspectionId || !disposition) {
      return NextResponse.json({ error: "Inspection ID and Disposition required" }, { status: 400 });
    }

    const result = await authorizeMaterialDisposition({
      inspectionId,
      disposition: disposition as DispositionType,
      authorizedById: user.id,
      authorizedByEmail: user.email,
      authorizedByName: user.fullName,
      reason,
      remarks,
    });

    return NextResponse.json({ success: true, disposition: result });
  } catch (err: any) {
    console.error("Failed to authorize disposition", err);
    return NextResponse.json({ error: err.message || "Failed to authorize disposition" }, { status: 500 });
  }
}
