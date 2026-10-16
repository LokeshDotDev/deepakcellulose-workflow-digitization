import { test, describe } from "node:test";
import assert from "node:assert";
import prisma from "../lib/db";
import { publishFormVersion, getActiveFormDefinition } from "../server/services/dynamic-form.service";
import { generateDocumentNumber } from "../server/services/numbering.service";
import { convertUnit } from "../server/services/uom.service";
import { transitionWorkflow } from "../server/services/workflow.service";

describe("2. ADMIN CONFIGURATION ENGINE TESTS", () => {
  // Test 2.1: Dynamic Form Publishing & Version Archival
  test("2.1 Dynamic Form schema publishes, auto-increments version, and archives previous version", async () => {
    const adminUser = await prisma.user.findFirst({ where: { email: "admin@deepakcellulose.com" } });
    assert.ok(adminUser, "Admin user must exist");
    const testAdminId = adminUser.id;

    // 1. Create a test form definition
    const formCode = `FORM-TEST-${Date.now()}`;
    const formDef = await prisma.formDefinition.create({
      data: {
        code: formCode,
        name: "QA Equipment Daily Check Sheet",
        entityType: "EQUIPMENT_MAINTENANCE",
        description: "Dynamic test checklist for equipment inspection",
      },
    });

    assert.ok(formDef.id);

    // 2. Publish Version 1
    const v1Schema = {
      sections: [
        {
          id: "sec-1",
          title: "Safety Checks",
          fields: [
            { key: "temp_c", label: "Reactor Temperature (°C)", type: "decimal" as const, required: true },
            { key: "pressure_bar", label: "Reactor Pressure (Bar)", type: "decimal" as const, required: true },
          ],
        },
      ],
    };

    const publishedV1 = await publishFormVersion({
      formDefinitionId: formDef.id,
      schema: v1Schema,
      actorId: testAdminId,
      actorName: "QA Admin",
    });

    assert.strictEqual(publishedV1.version, 1);
    assert.strictEqual(publishedV1.status, "PUBLISHED");

    // 3. Publish Version 2 with added field
    const v2Schema = {
      sections: [
        {
          id: "sec-1",
          title: "Safety Checks",
          fields: [
            { key: "temp_c", label: "Reactor Temperature (°C)", type: "decimal" as const, required: true },
            { key: "pressure_bar", label: "Reactor Pressure (Bar)", type: "decimal" as const, required: true },
            { key: "agitator_rpm", label: "Agitator Speed (RPM)", type: "integer" as const, required: false },
          ],
        },
      ],
    };

    const publishedV2 = await publishFormVersion({
      formDefinitionId: formDef.id,
      schema: v2Schema,
      actorId: testAdminId,
      actorName: "QA Admin",
    });

    assert.strictEqual(publishedV2.version, 2);
    assert.strictEqual(publishedV2.status, "PUBLISHED");

    // 4. Verify Version 1 was automatically moved to ARCHIVED
    const oldV1 = await prisma.formVersion.findUnique({
      where: { id: publishedV1.id },
    });
    assert.strictEqual(oldV1?.status, "ARCHIVED", "Previous published form version must transition to ARCHIVED");

    // 5. Active definition getter returns latest published version 2
    const active = await getActiveFormDefinition(formCode);
    assert.ok(active);
    assert.strictEqual(active.version, 2);
    assert.strictEqual(active.schema.sections[0].fields.length, 3);
  });

  // Test 2.2: Concurrency-Safe Sequential Document Numbering
  test("2.2 Numbering Service generates strictly unique sequential IDs under 10 concurrent requests", async () => {
    const concurrentRequests = 10;
    const promises = Array.from({ length: concurrentRequests }, () =>
      generateDocumentNumber("PURCHASE_ORDER")
    );

    const results = await Promise.all(promises);
    assert.strictEqual(results.length, concurrentRequests);

    // Verify uniqueness
    const uniqueNumbers = new Set(results);
    assert.strictEqual(
      uniqueNumbers.size,
      concurrentRequests,
      `All ${concurrentRequests} generated document numbers must be strictly unique`
    );

    // Verify format
    for (const num of results) {
      assert.ok(num.startsWith("PO-"), `Expected prefix PO-, got ${num}`);
      const parts = num.split("-");
      assert.strictEqual(parts.length, 3, "Format must be PREFIX-YYYY-NUMBER");
    }
  });

  // Test 2.3: Units of Measure & Dynamic Scale Conversions
  test("2.3 UOM Engine converts standard physical units and rejects invalid units", async () => {
    // Mass: 2.5 MT to KG
    const res1 = await convertUnit({ quantity: 2.5, fromUnitCode: "MT", toUnitCode: "KG" });
    assert.strictEqual(res1.convertedQuantity, 2500);

    // Mass: 500 GM to KG
    const res2 = await convertUnit({ quantity: 500, fromUnitCode: "GM", toUnitCode: "KG" });
    assert.strictEqual(res2.convertedQuantity, 0.5);

    // Volume: 1500 ML to LTR
    const res3 = await convertUnit({ quantity: 1500, fromUnitCode: "ML", toUnitCode: "LTR" });
    assert.strictEqual(res3.convertedQuantity, 1.5);

    // Identity conversion: same unit
    const res4 = await convertUnit({ quantity: 42, fromUnitCode: "KG", toUnitCode: "KG" });
    assert.strictEqual(res4.convertedQuantity, 42);

    // Invalid non-existent unit
    await assert.rejects(
      async () => {
        await convertUnit({ quantity: 10, fromUnitCode: "INVALID_UNIT", toUnitCode: "KG" });
      },
      (err: Error) => err.message.includes("not found in system"),
      "Must reject non-existent unit"
    );
  });

  // Test 2.4: State Machine Workflow Configuration & Role Authorization
  test("2.4 Workflow engine validates legal transitions and blocks unauthorized transitions", async () => {
    const adminUser = await prisma.user.findFirst({ where: { email: "admin@deepakcellulose.com" } });
    assert.ok(adminUser);

    // 1. Create a test workflow definition
    const entityType = `WORKFLOW_TEST_${Date.now()}`;
    const def = await prisma.workflowDefinition.create({
      data: {
        code: `WF-${Date.now()}`,
        name: "Test Capital Expenditure Approval",
        entityType,
        description: "Test state machine",
      },
    });

    // 2. Publish a workflow version with strict transition guards
    const stages = [
      { code: "DRAFT", name: "Draft Requisition" },
      { code: "PENDING_HOD", name: "Pending HOD Approval" },
      { code: "APPROVED", name: "Approved" },
      { code: "REJECTED", name: "Rejected" },
    ];

    const transitions = [
      { from: "DRAFT", to: "PENDING_HOD", action: "SUBMIT", roleRequired: "PURCHASE_MANAGER" },
      { from: "PENDING_HOD", to: "APPROVED", action: "APPROVE", roleRequired: "HEAD_OF_OPERATIONS" },
      { from: "PENDING_HOD", to: "REJECTED", action: "REJECT", roleRequired: "HEAD_OF_OPERATIONS" },
    ];

    const version = await prisma.workflowVersion.create({
      data: {
        workflowDefinitionId: def.id,
        version: 1,
        status: "PUBLISHED",
        stages: stages as any,
        transitions: transitions as any,
      },
    });

    const testEntityId = `ENTITY-${Date.now()}`;

    // 3. Valid transition: DRAFT -> PENDING_HOD via SUBMIT with PURCHASE_MANAGER role
    const instance = await transitionWorkflow({
      entityType,
      entityId: testEntityId,
      toStage: "PENDING_HOD",
      action: "SUBMIT",
      actorId: adminUser.id,
      userRoles: ["PURCHASE_MANAGER"],
    });

    assert.strictEqual(instance.currentStage, "PENDING_HOD");
    assert.strictEqual(instance.status, "IN_PROGRESS");

    // 4. Invalid transition: Attempting to jump directly from PENDING_HOD to DRAFT (not in transitions)
    await assert.rejects(
      async () => {
        await transitionWorkflow({
          entityType,
          entityId: testEntityId,
          toStage: "DRAFT",
          action: "RESET",
          actorId: adminUser.id,
          userRoles: ["PURCHASE_MANAGER"], // not Super Admin
        });
      },
      (err: Error) => err.message.includes("Invalid Transition"),
      "Must reject transitions not declared in workflow definition"
    );

    // 5. Unauthorized role attempt: Operator attempting to APPROVE
    await assert.rejects(
      async () => {
        await transitionWorkflow({
          entityType,
          entityId: testEntityId,
          toStage: "APPROVED",
          action: "APPROVE",
          actorId: adminUser.id,
          userRoles: ["OPERATOR"], // missing HEAD_OF_OPERATIONS
        });
      },
      (err: Error) => err.message.includes("Workflow Authorization Failed"),
      "Must reject approval by user lacking the required role"
    );

    // 6. Authorized transition: HEAD_OF_OPERATIONS approves
    const approvedInstance = await transitionWorkflow({
      entityType,
      entityId: testEntityId,
      toStage: "APPROVED",
      action: "APPROVE",
      actorId: adminUser.id,
      userRoles: ["HEAD_OF_OPERATIONS"],
    });

    assert.strictEqual(approvedInstance.currentStage, "APPROVED");
    assert.strictEqual(approvedInstance.status, "APPROVED");

    // 7. Verify transition history was recorded
    const history = await prisma.workflowTransitionHistory.findMany({
      where: { workflowInstanceId: instance.id },
      orderBy: { timestamp: "asc" },
    });

    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].action, "SUBMIT");
    assert.strictEqual(history[1].action, "APPROVE");
  });
});
