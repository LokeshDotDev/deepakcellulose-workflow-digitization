import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { publishProcessTemplateVersion } from "@/server/services/process-workflow.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user || (!user.roles.includes("SUPER_ADMIN") && !user.roles.includes("SYSTEM_ADMIN"))) {
      return NextResponse.json({ error: "Forbidden: Super Admin permission required to publish process templates" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json({ error: "versionId is required" }, { status: 400 });
    }

    const result = await publishProcessTemplateVersion(versionId, {
      id: user.id,
      email: user.email,
      name: user.fullName,
    });

    return NextResponse.json({ success: true, version: result });
  } catch (error: any) {
    console.error("POST /api/admin/process-templates/[id]/publish error:", error);
    return NextResponse.json({ error: error.message || "Failed to publish process template" }, { status: 500 });
  }
}
