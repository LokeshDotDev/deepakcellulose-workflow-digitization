import prisma from "@/lib/db";
import { logAuditEvent } from "./audit.service";

export interface TransitionWorkflowInput {
  instanceId?: string;
  entityType: string;
  entityId: string;
  toStage: string;
  action: string;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
  userRoles: string[];
  comments?: string;
  metadata?: Record<string, any>;
}

export async function transitionWorkflow(input: TransitionWorkflowInput) {
  return await prisma.$transaction(async (tx) => {
    // 1. Find or initialize workflow instance
    let instance = await tx.workflowInstance.findFirst({
      where: {
        entityType: input.entityType,
        entityId: input.entityId,
      },
      include: {
        workflowVersion: true,
      },
    });

    if (!instance) {
      // Find latest published workflow definition for this entity type
      const def = await tx.workflowDefinition.findFirst({
        where: { entityType: input.entityType, isActive: true },
        include: {
          versions: {
            where: { status: "PUBLISHED" },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      });

      if (!def || def.versions.length === 0) {
        throw new Error(`No published workflow configuration found for entity type '${input.entityType}'.`);
      }

      const version = def.versions[0];
      const stages = version.stages as any[];
      const initialStage = stages[0]?.code || "DRAFT";

      instance = await tx.workflowInstance.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          currentStage: initialStage,
          status: "IN_PROGRESS",
          workflowVersionId: version.id,
        },
        include: {
          workflowVersion: true,
        },
      });
    }

    const currentStage = instance.currentStage;
    const transitions = (instance.workflowVersion.transitions as any[]) || [];

    // 2. Validate that the requested transition is allowed
    const validTransition = transitions.find(
      (t) => t.from === currentStage && t.to === input.toStage && t.action === input.action
    );

    if (!validTransition && !input.userRoles.includes("SUPER_ADMIN")) {
      throw new Error(
        `Invalid Transition: Stage cannot move from '${currentStage}' to '${input.toStage}' via action '${input.action}'.`
      );
    }

    // 3. Validate role permission for the transition
    if (validTransition?.roleRequired && !input.userRoles.includes("SUPER_ADMIN")) {
      const allowed = input.userRoles.includes(validTransition.roleRequired);
      if (!allowed) {
        throw new Error(
          `Workflow Authorization Failed: Action '${input.action}' requires role '${validTransition.roleRequired}'. Current roles: ${input.userRoles.join(", ")}.`
        );
      }
    }

    // 4. Record transition history
    await tx.workflowTransitionHistory.create({
      data: {
        workflowInstanceId: instance.id,
        fromStage: currentStage,
        toStage: input.toStage,
        action: input.action,
        actorId: input.actorId,
        comments: input.comments,
        metadata: input.metadata,
      },
    });

    // 5. Update instance current stage
    const updatedInstance = await tx.workflowInstance.update({
      where: { id: instance.id },
      data: {
        currentStage: input.toStage,
        status: input.toStage.includes("REJECT") ? "REJECTED" : input.toStage.includes("RELEASE") || input.toStage.includes("APPROVED") ? "APPROVED" : "IN_PROGRESS",
      },
    });

    // 6. Audit Log
    await logAuditEvent({
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorName: input.actorName,
      action: "WORKFLOW_TRANSITION",
      entityType: input.entityType,
      entityId: input.entityId,
      details: {
        fromStage: currentStage,
        toStage: input.toStage,
        action: input.action,
        comments: input.comments,
      },
    });

    return updatedInstance;
  });
}
