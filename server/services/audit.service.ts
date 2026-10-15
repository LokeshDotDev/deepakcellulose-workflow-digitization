import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";

interface AuditLogParams {
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  documentNumber?: string | null;
  details?: Record<string, any> | Prisma.InputJsonValue;
  ipAddress?: string | null;
}

export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || undefined,
        actorEmail: params.actorEmail || undefined,
        actorName: params.actorName || undefined,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        documentNumber: params.documentNumber || undefined,
        details: params.details as Prisma.InputJsonValue || undefined,
        ipAddress: params.ipAddress || undefined,
      },
    });
  } catch (error) {
    console.error("Failed to record audit log entry:", error);
    // Never crash the primary transaction due to secondary logging failure, but log to stderr
  }
}

export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "ACTION_REQUIRED" | "SUCCESS";
  link?: string;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || "INFO",
        link: params.link,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}
