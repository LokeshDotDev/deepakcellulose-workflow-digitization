import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logAuditEvent } from "@/server/services/audit.service";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        department: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Check onboarding approval status
    if (user.approvalStatus === "PENDING" || !user.isActive) {
      return NextResponse.json(
        {
          error:
            "Your account is pending System Administrator approval. Once approved by the plant administrator, you will be granted access.",
          status: "PENDING",
        },
        { status: 403 }
      );
    }

    if (user.approvalStatus === "REJECTED") {
      return NextResponse.json(
        {
          error: "Your registration was rejected by the system administrator. Please contact IT/HR support.",
          status: "REJECTED",
        },
        { status: 403 }
      );
    }

    // Validate password (supports bcrypt hash and demo fallback)
    const isBcryptValid = await bcrypt.compare(password, user.passwordHash).catch(() => false);
    const isDemoMatch = password === "demo123" || password === "admin123";

    if (!isBcryptValid && !isDemoMatch) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Establish persistent authenticated session cookie
    await createSession(user.id);

    await logAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
      action: "USER_LOGIN_SUCCESS",
      entityType: "USER_SESSION",
      entityId: user.id,
      details: {
        email: user.email,
        roles: user.userRoles.map((ur) => ur.role.code),
        department: user.department?.name,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        department: user.department?.name,
        roles: user.userRoles.map((ur) => ur.role.code),
      },
    });
  } catch (err: any) {
    console.error("Login failed:", err);
    return NextResponse.json({ error: err.message || "Authentication failed." }, { status: 500 });
  }
}
