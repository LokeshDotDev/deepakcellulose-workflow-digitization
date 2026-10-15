import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { publishFormVersion } from "@/server/services/dynamic-form.service";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || (!user.roles.includes("SUPER_ADMIN") && !user.roles.includes("SYSTEM_ADMIN"))) {
      return NextResponse.json({ error: "Unauthorized: Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const { formDefinitionId, code, name, entityType, description, schema } = body;

    let targetId = formDefinitionId;

    if (!targetId) {
      const created = await prisma.formDefinition.create({
        data: {
          code,
          name,
          entityType,
          description,
        },
      });
      targetId = created.id;
    }

    const version = await publishFormVersion({
      formDefinitionId: targetId,
      schema,
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
    });

    return NextResponse.json({ success: true, version });
  } catch (err: any) {
    console.error("Failed to publish form version", err);
    return NextResponse.json({ error: err.message || "Failed to publish form" }, { status: 500 });
  }
}
