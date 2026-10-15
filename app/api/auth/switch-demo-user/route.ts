import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { department: true, userRoles: { include: { role: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await createSession(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        department: user.department?.name,
        role: user.userRoles[0]?.role.name,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to switch user" }, { status: 500 });
  }
}
