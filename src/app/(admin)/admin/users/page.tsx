"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthToken, useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Users, Loader2, UserX, AlertCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface Admin {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

function AddAdminDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const token = useAuthToken();

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create admin");
      }

      return res.json();
    },
    onSuccess: () => {
      setOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      onSuccess();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Admin User</DialogTitle>
          <DialogDescription>
            Create a new admin account for the dashboard
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              minLength={8}
              required
            />
          </div>

          {createMutation.error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>
                {createMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                !name ||
                !email ||
                password.length < 8
              }
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Admin"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeactivateButton({
  admin,
  currentAdminId,
  onSuccess,
}: {
  admin: Admin;
  currentAdminId: string;
  onSuccess: () => void;
}) {
  const token = useAuthToken();
  const [open, setOpen] = React.useState(false);

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/users/${admin.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: false }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to deactivate admin");
      }

      return res.json();
    },
    onSuccess: () => {
      setOpen(false);
      onSuccess();
    },
  });

  const isSelf = admin.id === currentAdminId;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={!admin.isActive || isSelf}
        >
          <UserX className="mr-1 size-4" />
          Deactivate
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate Admin Account</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to deactivate {admin.name}&apos;s account?
            They will no longer be able to log in to the admin dashboard.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deactivateMutation.mutate()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deactivateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Deactivating...
              </>
            ) : (
              "Deactivate"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AdminUsersPage() {
  const token = useAuthToken();
  const { admin: currentAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: admins, isLoading } = useQuery<Admin[]>({
    queryKey: ["admins"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch admins");
      return res.json();
    },
    enabled: !!token,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admins"] });
  };

  const activeCount = admins?.filter((a) => a.isActive).length || 0;
  const inactiveCount = admins?.filter((a) => !a.isActive).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Users</h1>
          <p className="text-muted-foreground">
            Manage who has access to the admin dashboard
          </p>
        </div>
        <AddAdminDialog onSuccess={handleRefresh} />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {activeCount}
            </div>
            <p className="text-sm text-muted-foreground">Active admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">
              {inactiveCount}
            </div>
            <p className="text-sm text-muted-foreground">Deactivated</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Admins</CardTitle>
          <CardDescription>
            Active and deactivated admin accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : admins && admins.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Created
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{admin.name}</p>
                        <p className="text-xs text-muted-foreground sm:hidden">
                          {admin.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {admin.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          admin.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                        }
                      >
                        {admin.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {formatDistanceToNow(new Date(admin.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {currentAdmin && (
                        <DeactivateButton
                          admin={admin}
                          currentAdminId={currentAdmin.id}
                          onSuccess={handleRefresh}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="size-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No admins found</p>
              <p className="text-sm">Create an admin to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
