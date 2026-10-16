import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  instantiateBatchProcess,
  transitionBatchStage,
} from "@/server/services/process-workflow.service";
import { StageExecutionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: batchId } = await params;

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        productionOrder: { include: { product: true } },
        formula: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Ensure execution exists (auto-instantiate if needed)
    let execution = await prisma.batchProcessExecution.findUnique({
      where: { batchId },
      include: {
        template: true,
        templateVersion: {
          include: {
            nodes: {
              include: { materials: true, controlPoints: true },
              orderBy: { sequenceOrder: "asc" },
            },
            edges: {
              include: { sourceNode: true, targetNode: true },
            },
          },
        },
        stageExecutions: {
          include: {
            node: {
              include: { materials: true, controlPoints: true },
            },
            deviations: true,
          },
        },
      },
    });

    if (!execution) {
      execution = (await instantiateBatchProcess(batchId)) as any;
    }

    return NextResponse.json({
      batch,
      execution,
    });
  } catch (error: any) {
    console.error("GET /api/production/batches/[id]/process error:", error);
    return NextResponse.json({ error: error.message || "Failed to load batch process execution" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: batchId } = await params;
    const body = await req.json();
    const { action, stageExecutionId, newStatus, payload } = body;

    if (!action || !stageExecutionId) {
      return NextResponse.json({ error: "action and stageExecutionId are required" }, { status: 400 });
    }

    if (action === "TRANSITION_STAGE") {
      if (!newStatus) {
        return NextResponse.json({ error: "newStatus is required" }, { status: 400 });
      }

      const result = await transitionBatchStage(
        stageExecutionId,
        newStatus as StageExecutionStatus,
        {
          id: user.id,
          email: user.email,
          name: user.fullName,
          roles: user.roles,
        },
        payload
      );

      return NextResponse.json({ success: true, stageExecution: result });
    } else if (action === "LOG_DEVIATION") {
      const { title, description, severity, immediateAction } = payload || {};
      if (!title || !description) {
        return NextResponse.json({ error: "Deviation title and description are required" }, { status: 400 });
      }

      const devCode = `DEV-${Date.now().toString().slice(-6)}`;
      const deviation = await prisma.batchProcessDeviation.create({
        data: {
          stageExecutionId,
          deviationCode: devCode,
          title,
          description,
          severity: severity || "MINOR",
          immediateAction,
          reportedById: user.id,
        },
      });

      // Optionally set stage to ON_HOLD if severity is MAJOR or CRITICAL
      if (severity === "MAJOR" || severity === "CRITICAL") {
        await prisma.batchStageExecution.update({
          where: { id: stageExecutionId },
          data: { status: StageExecutionStatus.ON_HOLD },
        });
      }

      return NextResponse.json({ success: true, deviation });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/production/batches/[id]/process error:", error);
    return NextResponse.json({ error: error.message || "Failed to process stage action" }, { status: 500 });
  }
}
