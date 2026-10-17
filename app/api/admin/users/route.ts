import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/server/services/audit.service";

export async function GET() {
  try {
    const user = await getSession();
    if (!user || (!user.roles.includes("SUPER_ADMIN") && !user.roles.includes("ADMIN"))) {
      return NextResponse.json({ error: "Unauthorized: Administrator access required." }, { status: 403 });
    }

    const [users, roles, departments] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          department: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      }),
      prisma.role.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.department.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ users, roles, departments });
  } catch (err: any) {
    console.error("Failed to fetch admin users:", err);
    return NextResponse.json({ error: err.message || "Failed to load users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getSession();
    if (!admin || (!admin.roles.includes("SUPER_ADMIN") && !admin.roles.includes("ADMIN"))) {
      return NextResponse.json({ error: "Unauthorized: Administrator access required." }, { status: 403 });
    }

    const body = await req.json();
    const { action, userId, roleIds, departmentId, customPermissions, isActive, rejectionReason } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    if (action === "APPROVE_USER") {
      const assignedRoleIds: string[] = Array.isArray(roleIds) ? roleIds : [];
      const assignedPerms: string[] = Array.isArray(customPermissions) ? customPermissions : [];

      const updated = await prisma.$transaction(async (tx) => {
        // 1. Update user approval status & active flag
        const u = await tx.user.update({
          where: { id: userId },
          data: {
            approvalStatus: "APPROVED",
            isActive: true,
            departmentId: departmentId || undefined,
            customPermissions: assignedPerms,
          },
        });

        // 2. Remove any previous roles
        await tx.userRole.deleteMany({
          where: { userId },
        });

        // 3. Assign new roles
        for (const rId of assignedRoleIds) {
          await tx.userRole.create({
            data: {
              userId,
              roleId: rId,
            },
          });
        }

        // 4. Create welcome / approval notification for user
        await tx.notification.create({
          data: {
            userId,
            type: "SUCCESS",
            title: "Access Granted to Deepak Cellulose ERP",
            message: "Your onboarding registration has been approved by the System Administrator. Your role assignments are active.",
            link: "/",
          },
        });

        return u;
      });

      await logAuditEvent({
        actorId: admin.id,
        actorEmail: admin.email,
        actorName: admin.fullName,
        action: "APPROVE_USER_ONBOARDING",
        entityType: "USER",
        entityId: userId,
        details: {
          approvedUserId: userId,
          assignedRoleIds,
          departmentId,
          customPermissions: assignedPerms,
        },
      });

      return NextResponse.json({ success: true, user: updated, message: "User approved successfully." });
    }

    if (action === "REJECT_USER") {
      const rejected = await prisma.user.update({
        where: { id: userId },
        data: {
          approvalStatus: "REJECTED",
          isActive: false,
        },
      });

      await logAuditEvent({
        actorId: admin.id,
        actorEmail: admin.email,
        actorName: admin.fullName,
        action: "REJECT_USER_ONBOARDING",
        entityType: "USER",
        entityId: userId,
        details: { rejectionReason },
      });

      return NextResponse.json({ success: true, user: rejected, message: "User registration rejected." });
    }

    if (action === "UPDATE_ROLES_PERMISSIONS") {
      const assignedRoleIds: string[] = Array.isArray(roleIds) ? roleIds : [];
      const assignedPerms: string[] = Array.isArray(customPermissions) ? customPermissions : [];

      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id: userId },
          data: {
            isActive: typeof isActive === "boolean" ? isActive : undefined,
            departmentId: departmentId || undefined,
            customPermissions: assignedPerms,
          },
        });

        // Update assigned roles
        await tx.userRole.deleteMany({
          where: { userId },
        });

        for (const rId of assignedRoleIds) {
          await tx.userRole.create({
            data: {
              userId,
              roleId: rId,
            },
          });
        }

        return u;
      });

      await logAuditEvent({
        actorId: admin.id,
        actorEmail: admin.email,
        actorName: admin.fullName,
        action: "UPDATE_USER_ROLES_PERMISSIONS",
        entityType: "USER",
        entityId: userId,
        details: {
          assignedRoleIds,
          customPermissions: assignedPerms,
          isActive,
        },
      });

      return NextResponse.json({ success: true, user: updated, message: "User roles and permissions updated successfully." });
    }

    return NextResponse.json({ error: "Unknown action specified." }, { status: 400 });
  } catch (err: any) {
    console.error("Admin user action failed:", err);
    return NextResponse.json({ error: err.message || "Operation failed" }, { status: 500 });
  }
}
