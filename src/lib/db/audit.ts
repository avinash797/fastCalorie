import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

type EntityType = "restaurant" | "menu_item" | "ingestion_job" | "admin";
type AuditAction = "create" | "update" | "delete" | "approve";

interface LogAuditParams {
  adminId: string;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  beforeData?: unknown;
  afterData?: unknown;
}

export async function logAudit(params: LogAuditParams) {
  await db.insert(auditLogs).values({
    adminId: params.adminId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    beforeData: params.beforeData,
    afterData: params.afterData,
  });
}
