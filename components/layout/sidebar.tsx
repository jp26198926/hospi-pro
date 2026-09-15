"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Settings,
  Users,
  Shield,
  FileText,
  BarChart3,
  Calendar,
  Mail,
  Bell,
  Search,
  LayoutDashboard,
  Lock,
  Globe,
  Heart,
  Star,
  Bookmark,
  Tag,
  Folder,
  Image,
  Video,
  Music,
  Phone,
  MapPin,
  ShoppingCart,
  CreditCard,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  settings: Settings,
  users: Users,
  shield: Shield,
  "file-text": FileText,
  "bar-chart-3": BarChart3,
  calendar: Calendar,
  mail: Mail,
  bell: Bell,
  search: Search,
  "layout-dashboard": LayoutDashboard,
  lock: Lock,
  globe: Globe,
  heart: Heart,
  star: Star,
  bookmark: Bookmark,
  tag: Tag,
  folder: Folder,
  image: Image,
  video: Video,
  music: Music,
  phone: Phone,
  "map-pin": MapPin,
  "shopping-cart": ShoppingCart,
  "credit-card": CreditCard,
};

interface PageItem {
  id: number;
  page: string;
  path: string;
  icon: string | null;
  parentId: number | null;
  order: number | null;
  status: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: { label: string; href: string }[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function getIcon(iconName: string | null): LucideIcon {
  if (!iconName) return FileText;
  return iconMap[iconName] || FileText;
}

function buildNavTree(pages: PageItem[]): NavItem[] {
  const parents = pages
    .filter((p) => p.parentId === null)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

  return parents.map((parent) => {
    const children = pages
      .filter((p) => p.parentId === parent.id)
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
      .map((child) => ({
        label: child.page,
        href: child.path,
      }));

    return {
      label: parent.page,
      href: parent.path,
      icon: getIcon(parent.icon),
      children: children.length > 0 ? children : undefined,
    };
  });
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [appSettings, setAppSettings] = useState<{ appLogo: string | null; appName: string }>({ appLogo: null, appName: "RBAC Admin" });
  const pathname = usePathname();

  const fetchPages = useCallback(async () => {
    try {
      const res = await fetch("/api/pages?status=Active&limit=100");
      const json = await res.json();
      if (json.data) {
        setNavItems(buildNavTree(json.data));
      }
    } catch (error) {
      console.error("Failed to fetch pages for sidebar:", error);
    }
  }, []);

  useEffect(() => {
    fetchPages();
    fetch("/api/settings-application")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setAppSettings({
            appLogo: json.data.appLogo || null,
            appName: json.data.appName || "RBAC Admin",
          });
        }
      })
      .catch(() => {});
  }, [fetchPages]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const handleLinkClick = () => {
    if (mobileOpen) onMobileClose();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors
    }
    localStorage.removeItem("accessToken");
    router.push("/login");
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-12 items-center border-b border-white/10 px-3">
        {appSettings.appLogo ? (
          <img src={appSettings.appLogo} alt="Logo" className="h-6 w-6 shrink-0 object-contain" />
        ) : (
          <Shield className="h-6 w-6 shrink-0 text-white" />
        )}
        {!collapsed && (
          <span className="ml-2 text-sm font-semibold tracking-wide">{appSettings.appName}</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {navItems.map((item) => (
          <div key={item.label} className="group relative">
            {item.children ? (
              <>
                <button
                  onClick={() => !collapsed && toggleExpand(item.label)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-white/10",
                    expandedItems.includes(item.label) && "bg-white/5"
                  )}
                >
                  <span className="shrink-0"><item.icon className="h-4 w-4" /></span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {expandedItems.includes(item.label) ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </>
                  )}
                </button>
                {/* Expanded submenu (desktop, not collapsed) */}
                {!collapsed && expandedItems.includes(item.label) && (
                  <div className="bg-black/10">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={handleLinkClick}
                        className={cn(
                          "flex items-center gap-3 px-6 py-2 text-sm transition-colors hover:bg-white/10",
                          pathname === child.href && "bg-white/15 font-medium"
                        )}
                      >
                        <span className="h-1 w-1 bg-white/50" />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
                {/* Context menu on hover when collapsed */}
                {collapsed && (
                  <div className="absolute left-full top-0 z-50 hidden w-48 border border-[#ddd] bg-white shadow-lg group-hover:block">
                    <div className="border-b border-[#ddd] bg-[#f8f8f8] px-3 py-2">
                      <span className="text-xs font-semibold text-[#337ab7]">{item.label}</span>
                    </div>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={handleLinkClick}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-sm text-[#333] transition-colors hover:bg-[#f0f7ff]",
                          pathname === child.href && "bg-[#e8f0fe] font-medium"
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-white/10",
                  pathname === item.href && "bg-white/15 font-medium"
                )}
              >
                <span className="shrink-0"><item.icon className="h-4 w-4" /></span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/10">
        {/* Collapse button — desktop only */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex w-full items-center justify-center py-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col bg-[#438eb9] text-white transition-all duration-300 md:flex",
          collapsed ? "w-[60px]" : "w-[220px]"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={onMobileClose}
          />
          {/* Sidebar panel */}
          <aside className="fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col bg-[#438eb9] text-white md:hidden">
            {/* Close button */}
            <div className="flex h-12 items-center justify-between border-b border-white/10 px-3">
              <div className="flex items-center">
                {appSettings.appLogo ? (
                  <img src={appSettings.appLogo} alt="Logo" className="h-6 w-6 shrink-0 object-contain" />
                ) : (
                  <Shield className="h-6 w-6 shrink-0 text-white" />
                )}
                <span className="ml-2 text-sm font-semibold tracking-wide">{appSettings.appName}</span>
              </div>
              <button
                onClick={onMobileClose}
                className="text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-2">
              {navItems.map((item) => (
                <div key={item.label}>
                  {item.children ? (
                    <>
                      <button
                        onClick={() => toggleExpand(item.label)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-white/10",
                          expandedItems.includes(item.label) && "bg-white/5"
                        )}
                      >
                        <span className="shrink-0"><item.icon className="h-4 w-4" /></span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {expandedItems.includes(item.label) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>
                      {expandedItems.includes(item.label) && (
                        <div className="bg-black/10">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={handleLinkClick}
                              className={cn(
                                "flex items-center gap-3 px-6 py-2 text-sm transition-colors hover:bg-white/10",
                                pathname === child.href && "bg-white/15 font-medium"
                              )}
                            >
                              <span className="h-1 w-1 bg-white/50" />
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-white/10",
                        pathname === item.href && "bg-white/15 font-medium"
                      )}
                    >
                      <span className="shrink-0"><item.icon className="h-4 w-4" /></span>
                      <span>{item.label}</span>
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Logout */}
            <div className="border-t border-white/10">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
