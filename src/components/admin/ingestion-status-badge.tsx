import { Badge } from "@/components/ui/badge";

export type IngestionJobStatus =
  | "pending"
  | "processing"
  | "review"
  | "approved"
  | "failed";

interface IngestionStatusBadgeProps {
  status: IngestionJobStatus;
}

const variants: Record<
  IngestionJobStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  },
  review: {
    label: "Ready for Review",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  },
  approved: {
    label: "Approved",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  },
};

export function IngestionStatusBadge({ status }: IngestionStatusBadgeProps) {
  const variant = variants[status] || variants.pending;

  return (
    <Badge variant="secondary" className={variant.className}>
      {variant.label}
    </Badge>
  );
}
