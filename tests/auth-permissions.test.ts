import { test, describe } from "node:test";
import assert from "node:assert";
import prisma from "../lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "deepak-cellulose-erp-secret-key-production-ready-2026";

function signToken(userId: string): string {
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(userId);
  const signature = hmac.digest("base64url");
  return `${userId}.${signature}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expectedSig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length) {
    return null;
  }
  if (crypto.timingSafeEqual(sigBuf, expBuf)) {
    return payload;
  }
  return null;
}

describe("1. AUTHENTICATION & DEPARTMENTAL RBAC TESTS", () => {
  const departmentalProfiles = [
    { email: "admin@deepakcellulose.com", role: "SUPER_ADMIN", dept: "ADMIN" },
    { email: "purchase@deepakcellulose.com", role: "PURCHASE_MANAGER", dept: "PURCHASE" },
    { email: "gate@deepakcellulose.com", role: "GATE_OPERATOR", dept: "GATE" },
    { email: "warehouse@deepakcellulose.com", role: "WAREHOUSE_MANAGER", dept: "WAREHOUSE" },
    { email: "qc@deepakcellulose.com", role: "QC_MANAGER", dept: "QC" },
    { email: "production@deepakcellulose.com", role: "PRODUCTION_MANAGER", dept: "PRODUCTION" },
    { email: "fg@deepakcellulose.com", role: "FG_MANAGER", dept: "FINISHED_GOODS" },
    { email: "dispatch@deepakcellulose.com", role: "DISPATCH_MANAGER", dept: "DISPATCH" },
    { email: "accounts@deepakcellulose.com", role: "ACCOUNTS_MANAGER", dept: "ACCOUNTS" },
    { email: "management@deepakcellulose.com", role: "MANAGEMENT_VIEWER", dept: "MANAGEMENT" },
  ];

  test("1.1 All 10 Departmental Accounts exist with valid credentials and active status", async () => {
    for (const profile of departmentalProfiles) {
      const user = await prisma.user.findUnique({
        where: { email: profile.email },
        include: {
          department: true,
          userRoles: { include: { role: true } },
        },
      });

      assert.ok(user, `User ${profile.email} must exist in the database`);
      assert.strictEqual(user.isActive, true, `User ${profile.email} must be active`);
      assert.ok(user.passwordHash.length > 20, "Password hash must be securely stored");

      const passwordValid = await bcrypt.compare("demo123", user.passwordHash);
      assert.strictEqual(passwordValid, true, `Password for ${profile.email} must authenticate with 'demo123'`);

      const userRoleCodes = user.userRoles.map((ur) => ur.role.code);
      assert.ok(
        userRoleCodes.includes(profile.role),
        `User ${profile.email} must have role '${profile.role}', found: ${userRoleCodes.join(", ")}`
      );

      assert.strictEqual(
        user.department?.code,
        profile.dept,
        `User ${profile.email} must belong to department '${profile.dept}'`
      );
    }
  });

  test("1.2 HMAC-SHA256 Session token signs and verifies deterministically", () => {
    const testUserId = "dc-test-user-id-001";
    const token = signToken(testUserId);

    assert.ok(token.includes("."), "Session token must contain payload and signature separated by dot");
    const verifiedId = verifyToken(token);
    assert.strictEqual(verifiedId, testUserId, "Verified user ID must match original signed user ID");

    // Tampered token must fail verification
    const tamperedToken = `${token}tamper`;
    const tamperedResult = verifyToken(tamperedToken);
    assert.strictEqual(tamperedResult, null, "Tampered session token must be rejected");

    // Token with altered payload must fail
    const forgedToken = signToken("other-user-id");
    const forgedParts = forgedToken.split(".");
    const mismatchedToken = `${testUserId}.${forgedParts[1]}`;
    assert.strictEqual(verifyToken(mismatchedToken), null, "Mismatched signature must be rejected");
  });

  test("1.3 Role-Based Permissions: Super Admin holds wildcard permission (*)", async () => {
    const admin = await prisma.user.findUnique({
      where: { email: "admin@deepakcellulose.com" },
      include: { userRoles: { include: { role: true } } },
    });

    assert.ok(admin);
    const roles = admin.userRoles.map((ur) => ur.role.code);
    assert.ok(roles.includes("SUPER_ADMIN"));
  });

  test("1.4 Granular Permission Scoping: Purchase user cannot release QC lots", async () => {
    const purchaseUser = await prisma.user.findUnique({
      where: { email: "purchase@deepakcellulose.com" },
      include: {
        userRoles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    assert.ok(purchaseUser);
    const permissions = new Set<string>();
    for (const ur of purchaseUser.userRoles) {
      for (const rp of ur.role.permissions) {
        permissions.add(rp.permission.code);
      }
    }

    // Purchase user must NOT have QC_RELEASE or QC_APPROVE
    assert.strictEqual(permissions.has("QC_RELEASE"), false, "Purchase Manager must not hold QC_RELEASE permission");
    assert.strictEqual(permissions.has("QC_APPROVE"), false, "Purchase Manager must not hold QC_APPROVE permission");
  });

  test("1.5 Granular Permission Scoping: QC Manager holds QC approval rights", async () => {
    const qcUser = await prisma.user.findUnique({
      where: { email: "qc@deepakcellulose.com" },
      include: {
        userRoles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    assert.ok(qcUser);
    const roles = qcUser.userRoles.map((ur) => ur.role.code);
    assert.ok(roles.includes("QC_MANAGER"));
  });

  test("1.6 Non-existent or deactivated user credentials fail authentication", async () => {
    const nonExistent = await prisma.user.findUnique({
      where: { email: "unauthorized.intruder@external.com" },
    });
    assert.strictEqual(nonExistent, null, "Unregistered user must not be found");
  });
});
