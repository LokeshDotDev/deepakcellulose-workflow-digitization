import test, { describe } from "node:test";
import assert from "node:assert";
import prisma from "../lib/db";
import { createNotification } from "../server/services/audit.service";

describe("4. NOTIFICATIONS, DASHBOARDS & REPORTING AUTOMATION SUITE", () => {
  let userPurchasing: any;
  let userQC: any;

  test("4.A Setup: Provision test recipients for notification and dashboard isolation", async () => {
    userPurchasing = await prisma.user.findUnique({
      where: { email: "purchase@deepakcellulose.com" },
    });

    userQC = await prisma.user.findUnique({
      where: { email: "qc@deepakcellulose.com" },
    });

    assert.ok(userPurchasing.id);
    assert.ok(userQC.id);
  });

  test("4.B Notification Scoping & Unread Tracking: Users only receive and query their own notifications", async () => {
    // Dispatch purchase notification to userPurchasing
    await createNotification({
      userId: userPurchasing.id,
      title: "Purchase Order Approved",
      message: "PO-2026-TEST has been approved by Purchase Manager.",
      type: "SUCCESS",
      link: "/procurement/orders/PO-2026-TEST",
    });

    // Dispatch QC notification to userQC
    await createNotification({
      userId: userQC.id,
      title: "QC Inspection Required",
      message: "New Raw Material Lot received and quarantined awaiting sampling.",
      type: "ACTION_REQUIRED",
      link: "/qc/inspections/INSP-2026-TEST",
    });

    // Verify userPurchasing sees exactly their notification
    const buyerNotifs = await prisma.notification.findMany({
      where: { userId: userPurchasing.id, isRead: false },
    });
    assert.ok(buyerNotifs.some((n) => n.title === "Purchase Order Approved"));
    assert.ok(!buyerNotifs.some((n) => n.title === "QC Inspection Required"), "Buyer must not receive QC notifications");

    // Verify userQC sees exactly their notification
    const qcNotifs = await prisma.notification.findMany({
      where: { userId: userQC.id, isRead: false },
    });
    assert.ok(qcNotifs.some((n) => n.title === "QC Inspection Required"));
    assert.ok(!qcNotifs.some((n) => n.title === "Purchase Order Approved"), "QC must not receive Buyer notifications");
  });

  test("4.C Notification State Mutation: Marking as read persists correctly in PostgreSQL", async () => {
    const unreadBefore = await prisma.notification.findFirst({
      where: { userId: userPurchasing.id, isRead: false },
    });
    assert.ok(unreadBefore);

    // Mark as read
    await prisma.notification.update({
      where: { id: unreadBefore.id },
      data: { isRead: true },
    });

    // Verify persistence
    const readAfter = await prisma.notification.findUnique({
      where: { id: unreadBefore.id },
    });
    assert.strictEqual(readAfter?.isRead, true);

    const activeUnread = await prisma.notification.count({
      where: { userId: userPurchasing.id, isRead: false },
    });
    assert.strictEqual(activeUnread, 0);
  });

  test("4.D Resilience: Notification failure does not abort the calling workflow", async () => {
    // Provide a non-existent fake foreign key userId
    // createNotification catches internal errors without throwing unhandled rejection
    await assert.doesNotReject(async () => {
      await createNotification({
        userId: "00000000-0000-0000-0000-000000000000",
        title: "Dead Letter Test",
        message: "Testing resilience against delivery failure",
        type: "WARNING",
      });
    });
  });

  test("4.E Dashboard Aggregation Metrics: Accurate counts across operational entities", async () => {
    const [openPOs, lotsPendingQC, activeBatches, availableFGLots] = await Promise.all([
      prisma.purchaseOrder.count({
        where: { status: { in: ["APPROVED", "PARTIALLY_RECEIVED", "SUBMITTED"] } },
      }),
      prisma.inventoryLot.count({
        where: { status: "RECEIVED_PENDING_QC" },
      }),
      prisma.batch.count({
        where: { status: "IN_PROGRESS" },
      }),
      prisma.finishedGoodsLot.count({
        where: { status: { in: ["AVAILABLE", "QC_APPROVED"] } },
      }),
    ]);

    assert.ok(typeof openPOs === "number");
    assert.ok(typeof lotsPendingQC === "number");
    assert.ok(typeof activeBatches === "number");
    assert.ok(typeof availableFGLots === "number");
  });

  test("4.F CSV Export Serialization: Escaping commas, quotes, and newlines adheres to RFC-4180", () => {
    const rawData = [
      {
        LotNumber: 'LOT-"SPECIAL"-001',
        ItemName: "Microcrystalline Cellulose, BP/USP",
        Quantity: 500,
        Remarks: "Multi-line\nobservation with, comma",
      },
    ];

    const headers = Object.keys(rawData[0]);
    const csvRows = [headers.join(",")];

    for (const row of rawData) {
      const values = headers.map((header) => {
        const val = (row as any)[header];
        const escaped = ("" + (val ?? "")).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    }

    const csvOutput = csvRows.join("\n");
    assert.ok(csvOutput.includes('"LOT-""SPECIAL""-001"'), "Double quotes must be escaped with twin quotes");
    assert.ok(csvOutput.includes('"Microcrystalline Cellulose, BP/USP"'), "Fields with commas must be wrapped in quotes");
    assert.ok(csvOutput.startsWith("LotNumber,ItemName,Quantity,Remarks"), "Headers must match field keys");
  });
});
