"use client";

import { QueryProvider } from "@/components/query-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          {/* Desktop sidebar */}
          <AdminSidebar />

          {/* Main content area */}
          <div className="flex flex-1 flex-col">
            <AdminHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </QueryProvider>
  );
}
