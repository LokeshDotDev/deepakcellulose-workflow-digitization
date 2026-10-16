import React from "react";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import { instantiateBatchProcess } from "@/server/services/process-workflow.service";
import { BatchProcessClient } from "./BatchProcessClient";

export const dynamic = "force-dynamic";

export default async function BatchProcessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: batchId } = await params;
  const user = await getSession();

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      productionOrder: { include: { product: true } },
      formula: true,
      consumptions: { include: { material: true, lot: true } },
      deviations: true,
    },
  });

  if (!batch) {
    notFound();
  }

  // Ensure execution instance exists
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
            include: {
              sourceNode: { select: { id: true, nodeKey: true, label: true } },
              targetNode: { select: { id: true, nodeKey: true, label: true } },
            },
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

  return (
    <BatchProcessClient
      batch={JSON.parse(JSON.stringify(batch))}
      execution={JSON.parse(JSON.stringify(execution))}
      user={user ? JSON.parse(JSON.stringify(user)) : null}
    />
  );
}
