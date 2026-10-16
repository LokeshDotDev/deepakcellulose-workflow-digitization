import { cookies } from "next/headers";
import prisma from "@/lib/db";
import crypto from "crypto";

const SESSION_COOKIE = "deepak_erp_session";
const SECRET = process.env.NEXTAUTH_SECRET || "deepak-cellulose-erp-secret-key-production-ready-2026";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  employeeCode?: string | null;
  departmentId?: string | null;
  departmentCode?: string | null;
  departmentName?: string | null;
  roles: string[];
  permissions: string[];
}

function sign(payload: string): string {
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(payload);
  const signature = hmac.digest("base64url");
  return `${payload}.${signature}`;
}

function verify(token: string): string | null {
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

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const token = sign(userId);
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  let userId: string | null = null;
  if (token) {
    userId = verify(token);
  }

  // If in demo mode and no user session is set, default to Super Admin
  if (!userId && process.env.DEMO_MODE === "true") {
    const defaultAdmin = await prisma.user.findUnique({
      where: { email: "admin@deepakcellulose.com" },
      select: { id: true },
    });
    if (defaultAdmin) {
      userId = defaultAdmin.id;
    }
  }

  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      department: true,
      userRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) return null;

  const roles = user.userRoles.map((ur) => ur.role.code);
  const permissionsSet = new Set<string>();

  // If super admin, give full permission wildcard
  if (roles.includes("SUPER_ADMIN")) {
    permissionsSet.add("*");
  }

  for (const ur of user.userRoles) {
    for (const rp of ur.role.permissions) {
      permissionsSet.add(rp.permission.code);
    }
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    employeeCode: user.employeeCode,
    departmentId: user.departmentId,
    departmentCode: user.department?.code || null,
    departmentName: user.department?.name || null,
    roles,
    permissions: Array.from(permissionsSet),
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    throw new Error("Unauthorized: Please sign in to access Deepak Cellulose ERP.");
  }
  return user;
}

export async function checkPermission(module: string, action: string): Promise<boolean> {
  const user = await getSession();
  if (!user) return false;
  if (user.roles.includes("SUPER_ADMIN")) return true;
  return user.permissions.includes(`${module}_${action}`) || user.permissions.includes("*");
}

export async function requirePermission(module: string, action: string): Promise<SessionUser> {
  const user = await requireUser();
  if (user.roles.includes("SUPER_ADMIN")) return user;
  const permCode = `${module}_${action}`;
  if (!user.permissions.includes(permCode) && !user.permissions.includes("*")) {
    throw new Error(`Forbidden: You lack permission '${permCode}' to perform this action.`);
  }
  return user;
}
