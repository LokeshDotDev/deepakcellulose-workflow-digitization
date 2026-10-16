import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/server/services/audit.service";
import { ProcessTemplateStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user || (!user.roles.includes("SUPER_ADMIN") && !user.roles.includes("SYSTEM_ADMIN"))) {
      return NextResponse.json({ error: "Forbidden: Super Admin permission required" }, { status: 403 });
    }

    const { id } = await params;

    const template = await prisma.processTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ error: "Process template not found" }, { status: 404 });
    }

    const updated = await prisma.processTemplate.update({
      where: { id },
      data: { status: ProcessTemplateStatus.ARCHIVED },
    });

    await logAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
      action: "UPDATE",
      entityType: "PROCESS_TEMPLATE",
      entityId: id,
      documentNumber: template.code,
      details: { action: "RETIRE_TEMPLATE", previousStatus: template.status },
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error: any) {
    console.error("POST /api/admin/process-templates/[id]/retire error:", error);
    return NextResponse.json({ error: error.message || "Failed to retire template" }, { status: 500 });
  }
}
