"use client";

import * as React from "react";
import { useLogin } from "@/hooks/use-auth";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { QueryProvider } from "@/components/query-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";

function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const login = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
            FC
          </div>
        </div>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your FastCalorie admin account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {login.error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>
                {login.error.message || "Login failed. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@fastcalorie.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={login.isPending}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={login.isPending}
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <QueryProvider>
      <div className="min-h-screen flex flex-col">
        {/* Header with theme toggle */}
        <header className="flex justify-end p-4">
          <ThemeToggle />
        </header>

        {/* Centered login form */}
        <main className="flex-1 flex items-center justify-center p-4">
          <LoginForm />
        </main>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground py-4">
          FastCalorie Admin &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </QueryProvider>
  );
}
