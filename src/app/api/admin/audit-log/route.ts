import { NextResponse } from "next/server";
import { eq, and, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, admins } from "@/lib/db/schema";
import { withAuth } from "@/lib/auth/middleware";

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );
    const offset = (page - 1) * limit;

    const conditions = [];
    if (entityType) {
      conditions.push(eq(auditLogs.entityType, entityType));
    }
    if (entityId) {
      conditions.push(eq(auditLogs.entityId, entityId));
    }

    const whereClause =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const [entries, [{ total }]] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          adminId: auditLogs.adminId,
          adminName: admins.name,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          action: auditLogs.action,
          beforeData: auditLogs.beforeData,
          afterData: auditLogs.afterData,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .innerJoin(admins, eq(auditLogs.adminId, admins.id))
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(auditLogs)
        .where(whereClause),
    ]);

    return NextResponse.json(
      {
        entries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
