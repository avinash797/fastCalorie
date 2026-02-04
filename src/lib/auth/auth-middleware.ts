import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { verifyToken, type AdminTokenPayload } from "@/lib/auth";

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  name: string;
}

type AuthenticatedHandler = (
  request: NextRequest,
  admin: AuthenticatedAdmin,
  context?: { params: Promise<Record<string, string>> },
) => Promise<NextResponse>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      );
    }

    const token = authHeader.slice(7);

    let payload: AdminTokenPayload;
    try {
      payload = verifyToken(token);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    const admin = await db
      .select({
        id: admins.id,
        email: admins.email,
        name: admins.name,
        isActive: admins.isActive,
      })
      .from(admins)
      .where(eq(admins.id, payload.adminId))
      .limit(1);

    if (admin.length === 0) {
      return NextResponse.json({ error: "Admin not found" }, { status: 401 });
    }

    if (!admin[0].isActive) {
      return NextResponse.json(
        { error: "Account deactivated" },
        { status: 403 },
      );
    }

    return handler(
      request,
      {
        id: admin[0].id,
        email: admin[0].email,
        name: admin[0].name,
      },
      context,
    );
  };
}
