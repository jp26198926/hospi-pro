"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Mail, User, Search, Menu, LogOut, Key, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChangePasswordModal } from "@/components/auth/change-password-modal";
import { ProfileModal } from "@/components/auth/profile-modal";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors - proceed with local cleanup
    }
    localStorage.removeItem("accessToken");
    router.push("/login");
  };

  return (
    <>
    <header className="sticky top-0 z-30 flex h-12 items-center border-b bg-[#438eb9] px-4 text-white shadow-md">
      {/* Left: Menu toggle + quick actions */}
      <div className="flex items-center gap-2">
        {/* <Button
          variant="ghost"
          size="icon-sm"
          className="text-white hover:bg-white/10"
          onClick={onToggleSidebar}
        >
          <Menu className="h-4 w-4" />
        </Button> */}

        {/* <div className="hidden items-center gap-1 sm:flex">
          <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10">
            <div className="flex h-5 w-5 items-center justify-center bg-green-500 text-[10px] font-bold">
              1
            </div>
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10">
            <div className="flex h-5 w-5 items-center justify-center bg-orange-500 text-[10px] font-bold">
              2
            </div>
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10">
            <div className="flex h-5 w-5 items-center justify-center bg-red-500 text-[10px] font-bold">
              3
            </div>
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10">
            <div className="flex h-5 w-5 items-center justify-center bg-purple-500 text-[10px] font-bold">
              4
            </div>
          </Button>
        </div> */}
      </div>

      {/* Right: Search + Notifications + User */}
      <div className="ml-auto flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/60" />
          <input
            type="text"
            placeholder="Search..."
            className="h-8 w-48 bg-white/15 pl-8 pr-3 text-sm text-white placeholder-white/50 outline-none focus:bg-white/25 focus:ring-1 focus:ring-white/30"
          />
        </div>

        {/* Notification icons */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-white hover:bg-white/10"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center bg-red-500 text-[9px] font-bold">
            4
          </span>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-white hover:bg-white/10"
        >
          <Mail className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center bg-red-500 text-[9px] font-bold">
            8
          </span>
        </Button>

        {/* User */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 border-l border-white/20 pl-3"
          >
            <div className="flex h-8 w-8 items-center justify-center bg-white/20">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden text-xs leading-tight lg:block">
              <div className="font-medium">Welcome,</div>
              <div className="font-semibold">Admin</div>
            </div>
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 border border-[#ddd] bg-white shadow-lg">
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  setProfileOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#333] transition-colors hover:bg-[#f0f7ff]"
              >
                <UserCircle className="h-4 w-4 text-[#337ab7]" />
                My Profile
              </button>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  setChangePasswordOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#333] transition-colors hover:bg-[#f0f7ff]"
              >
                <Key className="h-4 w-4 text-[#337ab7]" />
                Change Password
              </button>
              <div className="border-t border-[#eee]" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#d9534f] transition-colors hover:bg-[#fef0f0]"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
    <ChangePasswordModal open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
