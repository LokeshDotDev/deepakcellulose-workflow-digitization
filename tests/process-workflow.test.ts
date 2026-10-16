import { test, describe } from "node:test";
import assert from "node:assert";
import prisma from "../lib/db";
import {
  validateProcessGraph,
  createProcessTemplate,
  publishProcessTemplateVersion,
  instantiateBatchProcess,
  transitionBatchStage,
  ensureMasterMaterials,
} from "../server/services/process-workflow.service";
import { StageExecutionStatus, DepartmentCode } from "@prisma/client";

describe("HPMC-P BATCH PROCESS WORKFLOW — Automated Verification Tests", () => {
  // Test 1: Master Raw Materials exist and match transcription
  test("1. Raw Material Master includes RM01 through RM07 transcribed from flowchart", async () => {
    const materials = await ensureMasterMaterials();

    const expectedCodes = ["RM01", "RM02", "RM03", "RM04", "RM05", "RM06", "RM07"];
    for (const code of expectedCodes) {
      assert.ok(materials[code], `Expected raw material code ${code} to exist in master`);
      assert.ok(materials[code].name.length > 0, `Material ${code} must have a non-empty name`);
    }

    assert.strictEqual(materials["RM01"].name, "Glacial Acetic Acid");
    assert.strictEqual(materials["RM02"].name, "Hydroxypropyl methylcellulose (HPMC)");
    assert.strictEqual(materials["RM03"].name, "Sodium Acetate Anhydrous");
    assert.strictEqual(materials["RM04"].name, "Phthalic Anhydride");
    assert.strictEqual(materials["RM05"].name, "Hydrogen Peroxide");
    assert.strictEqual(materials["RM06"].name, "Process Water (Purified)");
    assert.strictEqual(materials["RM07"].name, "Water (dil AA)");
  });

  // Test 2: HPMC-P Process Template contains expected stages and connections
  test("2. HPMC-P template contains the expected 25+ stages, side branches, and control points", async () => {
    const template = await prisma.processTemplate.findUnique({
      where: { code: "PT-HPMC-P" },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            nodes: {
              include: { materials: true, controlPoints: true },
            },
            edges: {
              include: { sourceNode: true, targetNode: true },
            },
          },
        },
      },
    });

    assert.ok(template, "HPMC-P template 'PT-HPMC-P' must exist in database");
    assert.strictEqual(template.sopReference, "176QA06");
    assert.strictEqual(template.documentNumber, "07");
    assert.strictEqual(template.documentTitle, "PROCESS FLOWCHART – HPMC-P APPENDIX-A");

    const v1 = template.versions[0];
    assert.ok(v1, "Template Version 1 must exist");
    assert.ok(v1.nodes.length >= 25, `Expected at least 25 stages, found ${v1.nodes.length}`);

    // Verify key nodes exist
    const nodeLabels = new Set(v1.nodes.map((n) => n.label));
    assert.ok(nodeLabels.has("Cooking"), "Cooking stage must exist");
    assert.ok(nodeLabels.has("Preheating — RM01"), "Preheating RM01 stage must exist");
    assert.ok(nodeLabels.has("Pusher Centrifuge Wash"), "Pusher Centrifuge Wash must exist");
    assert.ok(nodeLabels.has("QC SF Testing"), "QC SF Testing must exist");
    assert.ok(nodeLabels.has("QC Viscosity"), "QC Viscosity must exist");
    assert.ok(nodeLabels.has("Metal Detection"), "Metal Detection must exist");
    assert.ok(nodeLabels.has("Sales / Incineration / Refining"), "Byproduct destination node must exist");

    // Verify side branch edge exists
    const byproductEdge = v1.edges.find((e) => e.edgeType === "BYPRODUCT" && e.label === "Acetic Acid Dilute");
    assert.ok(byproductEdge, "Acetic Acid Dilute byproduct edge must exist");
  });

  // Test 3: Graph Validation Engine rejects invalid connections and detects missing nodes
  test("3. Graph Validation Engine rejects invalid connections and reports dangling edges", () => {
    const invalidNodes = [
      { nodeKey: "N1", label: "Start", nodeType: "MATERIAL_RECEIPT" as any },
      { nodeKey: "N2", label: "End", nodeType: "FINISHED_GOODS" as any },
    ];

    const invalidEdges = [
      { sourceNodeKey: "N1", targetNodeKey: "NON_EXISTENT_NODE" },
    ];

    const val = validateProcessGraph(invalidNodes, invalidEdges);
    assert.strictEqual(val.isValid, false, "Validation must fail for non-existent target node");
    assert.ok(val.errors.some((e) => e.includes("non-existent target node")));
  });

  // Test 4: Unconfirmed connections generate warnings & block critical bypass
  test("4. Unconfirmed connections generate verification warnings for QA audit", () => {
    const nodes = [
      { nodeKey: "N1", label: "Stage 1", nodeType: "MATERIAL_RECEIPT" as any, requiresVerification: true },
      { nodeKey: "N2", label: "Stage 2", nodeType: "FINISHED_GOODS" as any },
    ];
    const edges = [
      { sourceNodeKey: "N1", targetNodeKey: "N2", requiresVerification: true },
    ];

    const val = validateProcessGraph(nodes, edges);
    assert.strictEqual(val.unconfirmedCount, 2);
    assert.ok(val.warnings.some((w) => w.includes("Requires Verification")));
    assert.ok(val.warnings.some((w) => w.includes("requires confirmation against original SOP")));
  });

  // Test 5: Batch Process Instantiation pins template version
  test("5. Batch Process Instantiation creates stage executions and pins template version", async () => {
    const activeBatch = await prisma.batch.findFirst({
      where: { status: "IN_PROGRESS" },
    });

    if (!activeBatch) {
      console.log("Skipping batch instantiation test: no active batch found");
      return;
    }

    const execution = await instantiateBatchProcess(activeBatch.id);
    assert.ok(execution, "Batch execution must be instantiated");
    assert.strictEqual(execution.batchId, activeBatch.id);
    assert.ok(execution.stageExecutions.length >= 25, "All template stages must be instantiated");

    // Root nodes with 0 incoming dependencies must be in READY status
    const readyStages = execution.stageExecutions.filter((s) => s.status === StageExecutionStatus.READY);
    assert.ok(readyStages.length > 0, "Initial root stages must be in READY status");
  });

  // Test 6: Mandatory Process Control Point prevents bypass when Specification is Not Configured
  test("6. Mandatory Control Point blocks completion if specification is not configured", async () => {
    const execution = await prisma.batchProcessExecution.findFirst({
      include: {
        stageExecutions: {
          include: { node: { include: { controlPoints: true } } },
        },
      },
    });

    if (!execution) return;

    // Find Cooking stage with 'Specification Not Configured'
    const cookingStage = execution.stageExecutions.find((s) => s.node.label === "Cooking");
    if (!cookingStage) return;

    // First transition to IN_PROGRESS
    await prisma.batchStageExecution.update({
      where: { id: cookingStage.id },
      data: { status: StageExecutionStatus.IN_PROGRESS },
    });

    // Attempting to complete Cooking stage must throw error due to 'Specification Not Configured'
    await assert.rejects(
      async () => {
        await transitionBatchStage(
          cookingStage.id,
          StageExecutionStatus.COMPLETED,
          { id: "test-operator", roles: ["OPERATOR"] }
        );
      },
      (err: Error) => {
        return err.message.includes("Specification Not Configured");
      },
      "Must block completion when process control specification is not yet approved"
    );
  });

  // Test 7: Parallel Stage Progression: Downstream nodes unlock only when all prerequisites are met
  test("7. Downstream nodes unlock to READY only when all upstream dependencies complete", async () => {
    const execution = await prisma.batchProcessExecution.findFirst({
      include: {
        stageExecutions: {
          include: { node: true },
        },
      },
    });

    if (!execution) return;

    // Node 01 (Supplies) -> Node 02 (Storage)
    const stage01 = execution.stageExecutions.find((s) => s.node.nodeKey === "NODE-01");
    const stage02 = execution.stageExecutions.find((s) => s.node.nodeKey === "NODE-02");

    if (stage01 && stage02) {
      // Ensure stage01 is IN_PROGRESS
      await prisma.batchStageExecution.update({
        where: { id: stage01.id },
        data: { status: StageExecutionStatus.IN_PROGRESS },
      });

      const admin = await prisma.user.findFirst({ where: { email: "admin@deepakcellulose.com" } });
      assert.ok(admin, "Admin user must exist");

      // Complete stage01
      await transitionBatchStage(
        stage01.id,
        StageExecutionStatus.COMPLETED,
        { id: admin.id, roles: ["SUPER_ADMIN"], name: admin.fullName, email: admin.email }
      );

      // Check that stage02 transitioned to READY
      const updatedStage02 = await prisma.batchStageExecution.findUnique({
        where: { id: stage02.id },
      });

      assert.strictEqual(
        updatedStage02?.status,
        StageExecutionStatus.READY,
        "Stage 02 must transition to READY once upstream prerequisite Stage 01 completes"
      );
    }
  });

  // Test 8: Stage Transitions generate Audit Log records
  test("8. Stage Transitions produce immutable audit trail records", async () => {
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: "BATCH_STAGE_EXECUTION" },
      orderBy: { timestamp: "desc" },
      take: 5,
    });

    assert.ok(auditLogs.length > 0, "Audit logs must exist for stage execution transitions");
    for (const log of auditLogs) {
      assert.strictEqual(log.action, "TRANSITION");
      assert.ok(log.documentNumber?.length! > 0);
    }
  });
});
