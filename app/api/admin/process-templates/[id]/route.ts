import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { updateDraftVersion } from "@/server/services/process-workflow.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(req.url);
    const versionParam = url.searchParams.get("version");

    const template = await prisma.processTemplate.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Process template not found" }, { status: 404 });
    }

    // Determine target version
    let targetVersionId = template.versions[0]?.id;
    if (versionParam) {
      const parsedNum = parseInt(versionParam, 10);
      const matched = template.versions.find((v) => v.versionNumber === parsedNum);
      if (matched) targetVersionId = matched.id;
    }

    const versionData = targetVersionId
      ? await prisma.processTemplateVersion.findUnique({
          where: { id: targetVersionId },
          include: {
            nodes: {
              include: {
                materials: true,
                controlPoints: true,
              },
              orderBy: { sequenceOrder: "asc" },
            },
            edges: {
              include: {
                sourceNode: { select: { id: true, nodeKey: true, label: true } },
                targetNode: { select: { id: true, nodeKey: true, label: true } },
              },
            },
          },
        })
      : null;

    return NextResponse.json({
      template,
      activeVersion: versionData,
    });
  } catch (error: any) {
    console.error("GET /api/admin/process-templates/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch template" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user || (!user.roles.includes("SUPER_ADMIN") && !user.roles.includes("SYSTEM_ADMIN"))) {
      return NextResponse.json({ error: "Forbidden: Super Admin permission required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { versionId, changeReason, effectiveDate, reviewDate, nodes, edges } = body;

    if (!versionId) {
      return NextResponse.json({ error: "versionId is required" }, { status: 400 });
    }

    const result = await updateDraftVersion(
      versionId,
      {
        changeReason,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        reviewDate: reviewDate ? new Date(reviewDate) : undefined,
        nodes: nodes || [],
        edges: edges || [],
      },
      {
        id: user.id,
        email: user.email,
        name: user.fullName,
      }
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("PUT /api/admin/process-templates/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update draft template" }, { status: 500 });
  }
}
