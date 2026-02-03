"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthToken } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, ArrowRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  adminId: string;
  adminName?: string;
  action: "create" | "update" | "delete";
  entityType: "restaurant" | "menuItem" | "ingestionJob" | "admin";
  entityId: string;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  createdAt: string;
}

interface Admin {
  id: string;
  name: string;
  email: string;
}

function ActionBadge({ action }: { action: AuditLog["action"] }) {
  const variants = {
    create: {
      label: "Created",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    },
    update: {
      label: "Updated",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    },
    delete: {
      label: "Deleted",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    },
  };

  const variant = variants[action];

  return (
    <Badge variant="secondary" className={variant.className}>
      {variant.label}
    </Badge>
  );
}

function EntityTypeBadge({ type }: { type: AuditLog["entityType"] }) {
  const labels: Record<AuditLog["entityType"], string> = {
    restaurant: "Restaurant",
    menuItem: "Menu Item",
    ingestionJob: "Ingestion",
    admin: "Admin",
  };

  return (
    <Badge variant="outline" className="font-normal">
      {labels[type] || type}
    </Badge>
  );
}

function DiffDisplay({
  before,
  after,
  action,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  action: AuditLog["action"];
}) {
  if (action === "create" && after) {
    const keys = Object.keys(after).filter(
      (k) => !["id", "createdAt", "updatedAt", "passwordHash"].includes(k),
    );
    if (keys.length === 0)
      return <span className="text-muted-foreground">—</span>;
    return (
      <div className="text-xs space-y-0.5">
        {keys.slice(0, 3).map((key) => (
          <div key={key} className="text-green-600 dark:text-green-400">
            + {key}: {String(after[key])}
          </div>
        ))}
        {keys.length > 3 && (
          <div className="text-muted-foreground">+{keys.length - 3} more</div>
        )}
      </div>
    );
  }

  if (action === "delete" && before) {
    const keys = Object.keys(before).filter(
      (k) => !["id", "createdAt", "updatedAt", "passwordHash"].includes(k),
    );
    if (keys.length === 0)
      return <span className="text-muted-foreground">—</span>;
    return (
      <div className="text-xs space-y-0.5">
        {keys.slice(0, 3).map((key) => (
          <div key={key} className="text-red-600 dark:text-red-400">
            - {key}: {String(before[key])}
          </div>
        ))}
        {keys.length > 3 && (
          <div className="text-muted-foreground">+{keys.length - 3} more</div>
        )}
      </div>
    );
  }

  if (action === "update" && before && after) {
    const changedKeys = Object.keys(after).filter((k) => {
      if (["id", "createdAt", "updatedAt", "passwordHash"].includes(k))
        return false;
      return JSON.stringify(before[k]) !== JSON.stringify(after[k]);
    });

    if (changedKeys.length === 0) {
      return <span className="text-muted-foreground">No visible changes</span>;
    }

    return (
      <div className="text-xs space-y-1">
        {changedKeys.slice(0, 3).map((key) => (
          <div key={key} className="flex items-center gap-1">
            <span className="text-muted-foreground">{key}:</span>
            <span className="text-red-600 dark:text-red-400 line-through">
              {String(before[key] ?? "—")}
            </span>
            <ArrowRight className="size-3 text-muted-foreground" />
            <span className="text-green-600 dark:text-green-400">
              {String(after[key] ?? "—")}
            </span>
          </div>
        ))}
        {changedKeys.length > 3 && (
          <div className="text-muted-foreground">
            +{changedKeys.length - 3} more
          </div>
        )}
      </div>
    );
  }

  return <span className="text-muted-foreground">—</span>;
}

export default function AuditLogPage() {
  const [entityTypeFilter, setEntityTypeFilter] = React.useState<string>("all");
  const [adminFilter, setAdminFilter] = React.useState<string>("all");
  const token = useAuthToken();

  const { data: logs, isLoading: loadingLogs } = useQuery<AuditLog[]>({
    queryKey: ["auditLogs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/audit-log", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.entries || [];
    },
    enabled: !!token,
  });

  const { data: admins } = useQuery<Admin[]>({
    queryKey: ["admins"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
  });

  // Get admin name mapping
  const adminMap = React.useMemo(() => {
    const map = new Map<string, string>();
    admins?.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [admins]);

  // Filter logs
  const filteredLogs = React.useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      const matchesType =
        entityTypeFilter === "all" || log.entityType === entityTypeFilter;
      const matchesAdmin = adminFilter === "all" || log.adminId === adminFilter;
      return matchesType && matchesAdmin;
    });
  }, [logs, entityTypeFilter, adminFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Track all changes made to restaurants, menu items, and users
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Entity Type</label>
              <Select
                value={entityTypeFilter}
                onValueChange={setEntityTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="restaurant">Restaurants</SelectItem>
                  <SelectItem value="menuItem">Menu Items</SelectItem>
                  <SelectItem value="ingestionJob">Ingestion Jobs</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Admin</label>
              <Select value={adminFilter} onValueChange={setAdminFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Admins</SelectItem>
                  {admins?.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loadingLogs ? (
            <div className="p-6 space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <History className="size-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No audit logs found</p>
              <p className="text-sm">
                {entityTypeFilter !== "all" || adminFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Changes will appear here as they happen"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Changes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium text-sm">
                          {format(new Date(log.createdAt), "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), "h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {adminMap.get(log.adminId) || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <ActionBadge action={log.action} />
                      </TableCell>
                      <TableCell>
                        <EntityTypeBadge type={log.entityType} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[300px]">
                        <DiffDisplay
                          before={log.beforeData}
                          after={log.afterData}
                          action={log.action}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Count */}
      {filteredLogs.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredLogs.length} entries
        </p>
      )}
    </div>
  );
}
