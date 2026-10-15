import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { confirmDispatchAndExit } from "@/server/services/dispatch.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { dispatchId } = body;

    if (!dispatchId) {
      return NextResponse.json({ error: "Dispatch ID required" }, { status: 400 });
    }

    const result = await confirmDispatchAndExit({
      dispatchId,
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("Failed to confirm dispatch", err);
    return NextResponse.json({ error: err.message || "Failed to confirm dispatch" }, { status: 500 });
  }
}
