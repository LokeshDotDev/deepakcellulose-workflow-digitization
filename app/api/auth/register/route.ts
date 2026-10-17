import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { logAuditEvent } from "@/server/services/audit.service";

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password, employeeCode, phone, requestedDepartments } = await req.json();

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Full Name, Email, and Password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check existing email
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Check existing employee code if provided
    if (employeeCode) {
      const existingCode = await prisma.user.findUnique({
        where: { employeeCode: employeeCode.trim() },
      });
      if (existingCode) {
        return NextResponse.json(
          { error: "An account with this Employee Code already exists." },
          { status: 400 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const deptsString = Array.isArray(requestedDepartments)
      ? requestedDepartments.join(", ")
      : typeof requestedDepartments === "string"
      ? requestedDepartments
      : "General Operations";

    // Create user in PENDING_APPROVAL state (isActive: false)
    const newUser = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        employeeCode: employeeCode ? employeeCode.trim() : null,
        phone: phone ? phone.trim() : null,
        isActive: false, // Locked until admin explicitly approves
        approvalStatus: "PENDING",
        requestedDepartments: deptsString,
      },
    });

    // Notify System Administrator
    const adminUser = await prisma.user.findFirst({
      where: {
        userRoles: {
          some: {
            role: { code: "SUPER_ADMIN" },
          },
        },
      },
    });

    if (adminUser) {
      await prisma.notification.create({
        data: {
          userId: adminUser.id,
          type: "ACTION_REQUIRED",
          title: `New User Access Request: ${newUser.fullName}`,
          message: `${newUser.fullName} (${newUser.email}) registered and requested access for: ${deptsString}. System Admin review & role assignment required.`,
          link: "/admin/users",
        },
      });
    }

    await logAuditEvent({
      actorId: newUser.id,
      actorEmail: newUser.email,
      actorName: newUser.fullName,
      action: "USER_REGISTERED_PENDING_APPROVAL",
      entityType: "USER_ONBOARDING",
      entityId: newUser.id,
      details: {
        email: newUser.email,
        requestedDepartments: deptsString,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Your account registration has been submitted successfully! Your account is currently pending System Administrator approval. You will receive access once approved by the administrator.",
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        approvalStatus: "PENDING",
      },
    });
  } catch (err: any) {
    console.error("Registration failed:", err);
    return NextResponse.json({ error: err.message || "Failed to submit registration." }, { status: 500 });
  }
}
