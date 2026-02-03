"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthToken } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileUp, Loader2, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  status: "active" | "draft" | "archived";
}

interface IngestionJob {
  id: string;
  restaurantId: string;
  status: "pending" | "processing" | "review" | "approved" | "failed";
  itemsExtracted: number;
  itemsApproved: number;
  errorMessage: string | null;
  createdAt: string;
}

function StatusBadge({ status }: { status: IngestionJob["status"] }) {
  const variants = {
    pending: {
      label: "Pending",
      className:
        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    },
    processing: {
      label: "Processing",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
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

  const variant = variants[status] || variants.pending;

  return (
    <Badge variant="secondary" className={variant.className}>
      {variant.label}
    </Badge>
  );
}

export default function IngestionPage() {
  return (
    <Suspense fallback={<IngestionPageSkeleton />}>
      <IngestionPageContent />
    </Suspense>
  );
}

function IngestionPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <Card>
        <CardContent className="p-8">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function IngestionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRestaurantId = searchParams.get("restaurantId");

  const [selectedRestaurantId, setSelectedRestaurantId] =
    React.useState<string>(preselectedRestaurantId || "");
  const [file, setFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const token = useAuthToken();
  const queryClient = useQueryClient();

  const { data: restaurants, isLoading: loadingRestaurants } = useQuery<
    Restaurant[]
  >({
    queryKey: ["restaurants"],
    queryFn: async () => {
      const res = await fetch("/api/admin/restaurants", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch restaurants");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: jobs, isLoading: loadingJobs } = useQuery<IngestionJob[]>({
    queryKey: ["ingestionJobs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ingestion/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch ingestion jobs");
      }
      return res.json();
    },
    enabled: !!token,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !selectedRestaurantId) {
        throw new Error("Please select a restaurant and file");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("restaurantId", selectedRestaurantId);

      const res = await fetch("/api/admin/ingestion/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ingestionJobs"] });
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Navigate to the job review page
      router.push(`/admin/ingestion/${data.id || data.jobId}`);
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">PDF Ingestion</h1>
        <p className="text-muted-foreground">
          Upload nutrition PDFs to extract menu item data
        </p>
      </div>

      {/* New Ingestion */}
      <Card>
        <CardHeader>
          <CardTitle>New Ingestion</CardTitle>
          <CardDescription>
            Upload a nutrition PDF to extract calorie and macro data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="restaurant">Restaurant</Label>
              <Select
                value={selectedRestaurantId}
                onValueChange={setSelectedRestaurantId}
              >
                <SelectTrigger id="restaurant">
                  <SelectValue placeholder="Select a restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {loadingRestaurants ? (
                    <SelectItem value="_loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    restaurants?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* File upload */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center 
              transition-colors cursor-pointer
              ${file ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
            `}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={handleFileChange}
            />
            <Upload className="size-10 mx-auto mb-4 text-muted-foreground" />
            {file ? (
              <>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">
                  Drop a PDF here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Nutrition PDF files only
                </p>
              </>
            )}
          </div>

          {uploadMutation.error && (
            <p className="text-sm text-destructive">
              {uploadMutation.error.message}
            </p>
          )}

          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={
              !file || !selectedRestaurantId || uploadMutation.isPending
            }
            className="w-full sm:w-auto"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FileUp className="mr-2 size-4" />
                Start Ingestion
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
          <CardDescription>
            Previous ingestion jobs and their status
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingJobs ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 flex-1" />
                </div>
              ))}
            </div>
          ) : jobs && jobs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">
                    Items
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const restaurant = restaurants?.find(
                    (r) => r.id === job.restaurantId,
                  );
                  return (
                    <TableRow key={job.id} className="group">
                      <TableCell>
                        <Link
                          href={`/admin/ingestion/${job.id}`}
                          className="font-medium hover:underline"
                        >
                          {restaurant?.name || "Unknown"}
                        </Link>
                        {job.errorMessage && (
                          <p className="text-xs text-destructive truncate max-w-[200px]">
                            {job.errorMessage}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums hidden sm:table-cell">
                        {job.itemsApproved}/{job.itemsExtracted}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {formatDistanceToNow(new Date(job.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/ingestion/${job.id}`}>
                          <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <FileUp className="size-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No ingestion jobs yet</p>
              <p className="text-sm">Upload a PDF to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
