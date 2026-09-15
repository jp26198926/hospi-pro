"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { Breadcrumb } from "./breadcrumb";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          "transition-all duration-300",
          collapsed ? "md:pl-[60px]" : "md:pl-[220px]"
        )}
      >
        <Navbar onToggleSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="p-4">
          <div className="mb-4">
            <Breadcrumb />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
