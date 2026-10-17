import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";
import { logAuditEvent } from "@/server/services/audit.service";

export async function POST() {
  try {
    const user = await getSession();
    if (user) {
      await logAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        actorName: user.fullName,
        action: "USER_LOGOUT",
        entityType: "USER_SESSION",
        entityId: user.id,
        details: { email: user.email },
      });
    }

    await clearSession();
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (err: any) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
