"use client";

import React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { AppProviders } from "../providers";

export const dynamic = "force-dynamic";

function getTitleFromPath(pathname: string): string {
  if (!pathname) return "Overview";
  if (pathname.startsWith("/dashboard/payment")) return "Payment";
  if (pathname.startsWith("/dashboard/trade")) return "Trade";
  if (pathname.startsWith("/dashboard/history")) return "History";
  if (pathname.startsWith("/dashboard/settings")) return "Settings";
  if (pathname.startsWith("/dashboard/test")) return "Test";
  return "Overview";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = getTitleFromPath(pathname);

  return (
    <AppProviders>
      <SidebarProvider
        style={{
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3rem",
          "--header-height": "3rem",
        } as React.CSSProperties}
      >
        <AppSidebar />
        <SidebarInset>
          <SiteHeader title={title} />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AppProviders>
  );
}


