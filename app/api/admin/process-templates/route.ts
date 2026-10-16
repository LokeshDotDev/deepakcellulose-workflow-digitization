import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createProcessTemplate } from "@/server/services/process-workflow.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.processTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          include: {
            _count: {
              select: { nodes: true, edges: true, executions: true },
            },
          },
        },
        _count: {
          select: { executions: true },
        },
      },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error("GET /api/admin/process-templates error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch process templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || (!user.roles.includes("SUPER_ADMIN") && !user.roles.includes("SYSTEM_ADMIN"))) {
      return NextResponse.json({ error: "Forbidden: Super Admin permission required to create process templates" }, { status: 403 });
    }

    const body = await req.json();
    const { code, name, documentTitle, sopReference, documentNumber, category, departmentCode, requiresVerification, nodes, edges } = body;

    if (!code || !name || !documentTitle || !sopReference) {
      return NextResponse.json({ error: "Code, Name, Document Title, and SOP Reference are required." }, { status: 400 });
    }

    const result = await createProcessTemplate({
      code,
      name,
      documentTitle,
      sopReference,
      documentNumber,
      category,
      departmentCode,
      requiresVerification,
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
      nodes,
      edges,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/process-templates error:", error);
    return NextResponse.json({ error: error.message || "Failed to create process template" }, { status: 500 });
  }
}
