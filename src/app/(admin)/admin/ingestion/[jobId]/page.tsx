"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthToken } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Save,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
// Matches the ExtractedItem from ai-agent.ts
interface ExtractedItem {
  name: string;
  category: string;
  servingSize: string | null;
  calories: number;
  totalFatG: number | null;
  saturatedFatG: number | null;
  transFatG: number | null;
  cholesterolMg: number | null;
  sodiumMg: number | null;
  totalCarbsG: number | null;
  dietaryFiberG: number | null;
  sugarsG: number | null;
  proteinG: number | null;
  confidence: "high" | "medium" | "low";
  notes: string | null;
}

// Matches ValidationCheck from validation.ts
interface ValidationCheck {
  name: string;
  status: "pass" | "warning" | "error";
  message: string;
}

// Matches ValidationResult from validation.ts
interface ValidationResult {
  itemIndex: number;
  itemName: string;
  status: "pass" | "warning" | "error";
  checks: ValidationCheck[];
}

// Combined item with validation data for display
interface DisplayItem extends ExtractedItem {
  originalIndex: number;
  validationStatus: "pass" | "warning" | "error";
  validationChecks: ValidationCheck[];
}

interface IngestionJob {
  id: string;
  restaurantId: string;
  status: "pending" | "processing" | "review" | "approved" | "failed";
  stage: string | null;
  pdfUrl: string | null;
  structuredData: ExtractedItem[] | null;
  validationReport: ValidationResult[] | null;
  approvedIndexes: number[] | null;
  itemsExtracted: number;
  itemsApproved: number;
  errorMessage: string | null;
  createdAt: string;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

const STAGES = ["upload", "extracting", "processing", "validating", "review"];

function ProgressSteps({
  currentStage,
  status,
}: {
  currentStage: string | null;
  status: string;
}) {
  const currentIndex = currentStage ? STAGES.indexOf(currentStage) : -1;

  return (
    <div className="flex items-center gap-2 justify-center flex-wrap">
      {STAGES.map((stage, i) => {
        const isCompleted = i < currentIndex || status === "approved";
        const isCurrent = stage === currentStage;
        const isFailed = status === "failed" && isCurrent;

        return (
          <React.Fragment key={stage}>
            {i > 0 && (
              <div
                className={cn(
                  "h-0.5 w-8 hidden sm:block",
                  isCompleted ? "bg-green-500" : "bg-muted",
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-sm font-medium",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent &&
                    !isFailed &&
                    "bg-primary text-primary-foreground",
                  isFailed && "bg-destructive text-destructive-foreground",
                  !isCompleted &&
                    !isCurrent &&
                    "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : isFailed ? (
                  <XCircle className="size-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-sm capitalize hidden sm:inline",
                  isCurrent ? "font-medium" : "text-muted-foreground",
                )}
              >
                {stage}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: ExtractedItem["confidence"];
}) {
  const variants = {
    high: {
      className:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    },
    medium: {
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    },
    low: {
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    },
  };

  const variant = variants[confidence];

  return (
    <Badge variant="secondary" className={cn("capitalize", variant.className)}>
      {confidence}
    </Badge>
  );
}

function ValidationBadge({
  status,
}: {
  status: "pass" | "warning" | "error";
}) {
  if (!status) return null;

  const variants = {
    pass: {
      icon: CheckCircle2,
      className:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    },
    warning: {
      icon: AlertTriangle,
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    },
    error: {
      icon: XCircle,
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    },
  };

  const variant = variants[status];
  const Icon = variant.icon;

  return (
    <Badge variant="secondary" className={cn("gap-1", variant.className)}>
      <Icon className="size-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function ReviewTable({
  items,
  selectedIds,
  onSelectionChange,
  onItemUpdate,
  isSaving,
}: {
  items: DisplayItem[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onItemUpdate: (
    index: number,
    field: keyof ExtractedItem,
    value: string | number,
  ) => void;
  isSaving: boolean;
}) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [editingCell, setEditingCell] = React.useState<{
    index: number;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = React.useState("");

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(items.map((_, i) => i.toString())));
    }
  };

  const handleSelect = (index: number) => {
    const newSet = new Set(selectedIds);
    const id = index.toString();
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  };

  const startEditing = (
    originalIndex: number,
    field: string,
    currentValue: string | number | null,
  ) => {
    setEditingCell({ index: originalIndex, field });
    setEditValue(currentValue?.toString() || "");
  };

  const saveEdit = () => {
    if (editingCell) {
      const value = [
        "calories",
        "totalFatG",
        "proteinG",
        "totalCarbsG",
      ].includes(editingCell.field)
        ? parseFloat(editValue) || 0
        : editValue;
      onItemUpdate(
        editingCell.index,
        editingCell.field as keyof ExtractedItem,
        value,
      );
      setEditingCell(null);
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
                className={someSelected ? "opacity-50" : ""}
              />
            </TableHead>
            <TableHead className="w-10"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Calories</TableHead>
            <TableHead className="text-right hidden md:table-cell">
              Fat
            </TableHead>
            <TableHead className="text-right hidden md:table-cell">
              Carbs
            </TableHead>
            <TableHead className="text-right hidden md:table-cell">
              Protein
            </TableHead>
            <TableHead className="hidden lg:table-cell">Confidence</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => {
            const id = index.toString();
            const isExpanded = expandedId === id;
            const isSelected = selectedIds.has(id);

            const rowBg =
              item.validationStatus === "error"
                ? "bg-red-50 dark:bg-red-950/20"
                : item.validationStatus === "warning"
                  ? "bg-yellow-50 dark:bg-yellow-950/20"
                  : "";

            return (
              <React.Fragment key={index}>
                <TableRow className={cn(rowBg, isSelected && "bg-accent")}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelect(index)}
                      aria-label={`Select ${item.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => setExpandedId(isExpanded ? null : id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {editingCell?.index === item.originalIndex &&
                    editingCell?.field === "name" ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-7 text-sm"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() => startEditing(item.originalIndex, "name", item.name)}
                      >
                        {item.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {editingCell?.index === item.originalIndex &&
                    editingCell?.field === "category" ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-7 text-sm w-24"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() =>
                          startEditing(item.originalIndex, "category", item.category)
                        }
                      >
                        {item.category}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {editingCell?.index === item.originalIndex &&
                    editingCell?.field === "calories" ? (
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-7 text-sm w-20 text-right"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() =>
                          startEditing(item.originalIndex, "calories", item.calories)
                        }
                      >
                        {item.calories}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden md:table-cell">
                    {editingCell?.index === item.originalIndex &&
                    editingCell?.field === "totalFatG" ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-7 text-sm w-16 text-right"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() =>
                          startEditing(item.originalIndex, "totalFatG", item.totalFatG)
                        }
                      >
                        {item.totalFatG != null ? `${item.totalFatG}g` : "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden md:table-cell">
                    {editingCell?.index === item.originalIndex &&
                    editingCell?.field === "totalCarbsG" ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-7 text-sm w-16 text-right"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() =>
                          startEditing(item.originalIndex, "totalCarbsG", item.totalCarbsG)
                        }
                      >
                        {item.totalCarbsG != null ? `${item.totalCarbsG}g` : "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden md:table-cell">
                    {editingCell?.index === item.originalIndex &&
                    editingCell?.field === "proteinG" ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-7 text-sm w-16 text-right"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() =>
                          startEditing(item.originalIndex, "proteinG", item.proteinG)
                        }
                      >
                        {item.proteinG != null ? `${item.proteinG}g` : "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <ConfidenceBadge confidence={item.confidence} />
                  </TableCell>
                  <TableCell>
                    <ValidationBadge status={item.validationStatus} />
                  </TableCell>
                </TableRow>

                {/* Expanded row */}
                {isExpanded && (
                  <TableRow className={rowBg}>
                    <TableCell colSpan={10} className="bg-muted/50 p-4">
                      <div className="space-y-4">
                        {/* Nutritional details */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                          <div>
                            <p className="text-muted-foreground mb-1">
                              Serving Size
                            </p>
                            <p className="font-medium">
                              {item.servingSize || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">
                              Saturated Fat
                            </p>
                            <p className="font-medium">
                              {item.saturatedFatG != null
                                ? `${item.saturatedFatG}g`
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">
                              Trans Fat
                            </p>
                            <p className="font-medium">
                              {item.transFatG != null
                                ? `${item.transFatG}g`
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">
                              Cholesterol
                            </p>
                            <p className="font-medium">
                              {item.cholesterolMg != null
                                ? `${item.cholesterolMg}mg`
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Sodium</p>
                            <p className="font-medium">
                              {item.sodiumMg != null ? `${item.sodiumMg}mg` : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Fiber</p>
                            <p className="font-medium">
                              {item.dietaryFiberG != null ? `${item.dietaryFiberG}g` : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Sugar</p>
                            <p className="font-medium">
                              {item.sugarsG != null ? `${item.sugarsG}g` : "—"}
                            </p>
                          </div>
                        </div>

                        {/* AI Confidence and Notes */}
                        <div className="border-t pt-4">
                          <div className="grid gap-4 sm:grid-cols-2 text-sm">
                            <div>
                              <p className="text-muted-foreground mb-1">
                                AI Confidence
                              </p>
                              <ConfidenceBadge confidence={item.confidence} />
                            </div>
                            {item.notes && (
                              <div>
                                <p className="text-muted-foreground mb-1">
                                  AI Notes
                                </p>
                                <p className="font-medium text-sm">
                                  {item.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Validation Checks */}
                        <div className="border-t pt-4">
                          <p className="text-muted-foreground mb-2 text-sm font-medium">
                            Validation Checks
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {item.validationChecks.map((check, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "flex items-start gap-2 rounded-md border p-2 text-sm",
                                  check.status === "pass" &&
                                    "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30",
                                  check.status === "warning" &&
                                    "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30",
                                  check.status === "error" &&
                                    "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
                                )}
                              >
                                {check.status === "pass" ? (
                                  <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                                ) : check.status === "warning" ? (
                                  <AlertTriangle className="size-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                                ) : (
                                  <XCircle className="size-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium text-xs capitalize">
                                    {check.name.replace(/_/g, " ")}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {check.message}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// Constants for polling
const POLLING_INTERVAL_MS = 2000;
const MAX_POLLING_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_POLL_ATTEMPTS = MAX_POLLING_DURATION_MS / POLLING_INTERVAL_MS;

export default function IngestionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const jobId = params.jobId as string;

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [localItems, setLocalItems] = React.useState<ExtractedItem[] | null>(
    null,
  );
  const pollCountRef = React.useRef(0);
  const [pollingTimedOut, setPollingTimedOut] = React.useState(false);

  const {
    data: job,
    isLoading,
    refetch,
  } = useQuery<IngestionJob>({
    queryKey: ["ingestionJob", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ingestion/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch job");
      return res.json();
    },
    enabled: !!token && !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll while pending or processing, but with a max attempt limit
      if (data?.status === "pending" || data?.status === "processing") {
        pollCountRef.current += 1;
        if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
          setPollingTimedOut(true);
          return false;
        }
        return POLLING_INTERVAL_MS;
      }
      // Reset poll count when status changes
      pollCountRef.current = 0;
      return false;
    },
  });

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ["restaurant", job?.restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/restaurants/${job!.restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch restaurant");
      return res.json();
    },
    enabled: !!token && !!job?.restaurantId,
  });

  // Sync local items with job data
  React.useEffect(() => {
    if (job?.structuredData && !localItems) {
      setLocalItems(job.structuredData);
    }
  }, [job?.structuredData, localItems]);

  // Merge extracted items with validation report to create display items
  // Filter out already-approved items
  const items: DisplayItem[] = React.useMemo(() => {
    const rawItems = localItems || job?.structuredData || [];
    const validationReport = job?.validationReport || [];
    const approvedSet = new Set(job?.approvedIndexes || []);

    return rawItems
      .map((item, index) => {
        const validation = validationReport.find((v) => v.itemIndex === index);
        return {
          ...item,
          originalIndex: index,
          validationStatus: validation?.status || "pass",
          validationChecks: validation?.checks || [],
        };
      })
      .filter((item) => !approvedSet.has(item.originalIndex));
  }, [localItems, job?.structuredData, job?.validationReport, job?.approvedIndexes]);

  const approveMutation = useMutation({
    mutationFn: async (itemIndices: number[]) => {
      const res = await fetch(`/api/admin/ingestion/${jobId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemIndexes: itemIndices }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Approval failed");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingestionJob", jobId] });
      queryClient.invalidateQueries({ queryKey: ["ingestionJobs"] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      setSelectedIds(new Set());
      setLocalItems(null); // Reset local state to use fresh data from server
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({
      itemIndex,
      updates,
    }: {
      itemIndex: number;
      updates: Partial<ExtractedItem>;
    }) => {
      const res = await fetch(
        `/api/admin/ingestion/${jobId}/items/${itemIndex}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Update failed");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingestionJob", jobId] });
      setLocalItems(null); // Reset local state to use fresh data from server
    },
  });

  const handleItemUpdate = React.useCallback(
    (originalIndex: number, field: keyof ExtractedItem, value: string | number) => {
      // Optimistically update local state
      setLocalItems((prev) => {
        const items = prev || job?.structuredData || [];
        const newItems = [...items];
        newItems[originalIndex] = { ...newItems[originalIndex], [field]: value };
        return newItems;
      });

      // Persist to server
      editMutation.mutate({
        itemIndex: originalIndex,
        updates: { [field]: value },
      });
    },
    [job?.structuredData, editMutation],
  );

  const handleApproveSelected = () => {
    // Map display indices back to original indices
    const originalIndices = Array.from(selectedIds).map((displayIdx) => {
      const item = items[Number(displayIdx)];
      return item.originalIndex;
    });
    approveMutation.mutate(originalIndices);
  };

  const handleApproveAllPassing = () => {
    // Get original indices of all non-error items
    const originalIndices = items
      .filter((item) => item.validationStatus !== "error")
      .map((item) => item.originalIndex);
    approveMutation.mutate(originalIndices);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Job not found</p>
        <Button variant="link" onClick={() => router.push("/admin/ingestion")}>
          Back to ingestion
        </Button>
      </div>
    );
  }

  const passingCount = items.filter(
    (i) => i.validationStatus !== "error",
  ).length;
  const warningCount = items.filter(
    (i) => i.validationStatus === "warning",
  ).length;
  const errorCount = items.filter((i) => i.validationStatus === "error").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/ingestion")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {restaurant?.name || "Loading..."} Ingestion
            </h1>
            <p className="text-muted-foreground text-sm">
              Started{" "}
              {formatDistanceToNow(new Date(job.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
        {job.pdfUrl && (
          <Button variant="outline" asChild>
            <a href={job.pdfUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 size-4" />
              View PDF
            </a>
          </Button>
        )}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-6">
          <ProgressSteps currentStage={job.stage} status={job.status} />
        </CardContent>
      </Card>

      {/* Status-specific content */}
      {(job.status === "pending" || job.status === "processing") && (
        <Card>
          <CardContent className="py-12 text-center">
            {pollingTimedOut ? (
              <>
                <AlertTriangle className="size-10 mx-auto mb-4 text-yellow-500" />
                <p className="text-lg font-medium">
                  Processing is taking longer than expected
                </p>
                <p className="text-muted-foreground mb-4">
                  The job may still be processing in the background.
                </p>
                <Button
                  onClick={() => {
                    pollCountRef.current = 0;
                    setPollingTimedOut(false);
                    refetch();
                  }}
                  variant="outline"
                >
                  <RefreshCw className="size-4 mr-2" />
                  Check Status
                </Button>
              </>
            ) : (
              <>
                <Loader2 className="size-10 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-lg font-medium">Processing PDF...</p>
                <p className="text-muted-foreground">
                  This may take a few minutes. The page will update
                  automatically.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {job.status === "failed" && (
        <Alert variant="destructive">
          <XCircle className="size-4" />
          <AlertTitle>Ingestion Failed</AlertTitle>
          <AlertDescription>
            {job.errorMessage || "An unknown error occurred during processing."}
          </AlertDescription>
        </Alert>
      )}

      {job.status === "approved" && (
        <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
          <CheckCircle2 className="size-4" />
          <AlertTitle>Ingestion Complete</AlertTitle>
          <AlertDescription>
            {job.itemsApproved} items have been added to the menu.{" "}
            <Link
              href={`/admin/items?restaurantId=${job.restaurantId}`}
              className="underline font-medium"
            >
              View menu items
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {job.status === "review" && items.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {passingCount}
                </div>
                <p className="text-sm text-muted-foreground">Passing</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">
                  {warningCount}
                </div>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">
                  {errorCount}
                </div>
                <p className="text-sm text-muted-foreground">Errors</p>
              </CardContent>
            </Card>
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} of {items.length} selected
            </span>
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() =>
                setSelectedIds(new Set(items.map((_, i) => i.toString())))
              }
            >
              Select All
            </Button>
            <Button
              variant="outline"
              onClick={handleApproveAllPassing}
              disabled={approveMutation.isPending || passingCount === 0}
            >
              Approve All Passing ({passingCount})
            </Button>
            <Button
              onClick={handleApproveSelected}
              disabled={approveMutation.isPending || selectedIds.size === 0}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="mr-2 size-4" />
                  Approve Selected ({selectedIds.size})
                </>
              )}
            </Button>
          </div>

          {approveMutation.error && (
            <Alert variant="destructive">
              <XCircle className="size-4" />
              <AlertDescription>
                {approveMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Review table */}
          <Card>
            <CardHeader>
              <CardTitle>Extracted Items</CardTitle>
              <CardDescription>
                Click on cells to edit values. Expand rows to see full nutrition
                data.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ReviewTable
                items={items}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onItemUpdate={handleItemUpdate}
                isSaving={approveMutation.isPending}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
