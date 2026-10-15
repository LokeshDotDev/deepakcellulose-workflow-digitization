import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logAuditEvent } from "@/server/services/audit.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || (!user.roles.includes("SUPER_ADMIN") && !user.roles.includes("SYSTEM_ADMIN"))) {
      return NextResponse.json({ error: "Unauthorized: Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const { email, fullName, employeeCode, phone, departmentId, roleId, password } = body;

    if (!email || !fullName || !roleId) {
      return NextResponse.json({ error: "Email, Full Name, and Role required" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password || "demo123", 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        fullName,
        employeeCode,
        phone,
        passwordHash,
        departmentId: departmentId || undefined,
        userRoles: {
          create: [{ roleId }],
        },
      },
      include: {
        department: true,
        userRoles: { include: { role: true } },
      },
    });

    await logAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
      action: "CREATE_USER",
      entityType: "USER",
      entityId: newUser.id,
      documentNumber: newUser.employeeCode,
      details: { email, roleId, departmentId },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (err: any) {
    console.error("Failed to create user", err);
    return NextResponse.json({ error: err.message || "Failed to create user" }, { status: 500 });
  }
}
