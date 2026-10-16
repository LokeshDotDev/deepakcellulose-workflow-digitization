import React from "react";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ProcessDesignerClient } from "./ProcessDesignerClient";

export const dynamic = "force-dynamic";

export default async function ProcessDesignerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { id } = await params;
  const { version: versionQuery } = await searchParams;
  const user = await getSession();

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
    notFound();
  }

  // Selected or latest version
  let targetVersionId = template.versions[0]?.id;
  if (versionQuery) {
    const num = parseInt(versionQuery, 10);
    const matched = template.versions.find((v) => v.versionNumber === num);
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

  // Raw materials from master for selector
  const masterMaterials = await prisma.material.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true, category: true },
    orderBy: { code: "asc" },
  });

  return (
    <ProcessDesignerClient
      template={JSON.parse(JSON.stringify(template))}
      initialVersion={versionData ? JSON.parse(JSON.stringify(versionData)) : null}
      masterMaterials={JSON.parse(JSON.stringify(masterMaterials))}
      userRoles={user?.roles || []}
    />
  );
}
