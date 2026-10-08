"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Bell, LogOut, Menu, Settings, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  SUPER_ADMIN: [
    { href: "/superadmin/vendors", label: "Vendors" },
    { href: "/superadmin/forms", label: "Forms" },
    { href: "/superadmin/permissions", label: "Permissions" },
    { href: "/superadmin/profile", label: "Profile" },
  ],
  ADMIN: [
    { href: "/admin", label: "Dashboard" },
  ],
  VENDOR: [
    { href: "/vendor/today", label: "Today" },
    { href: "/vendor/declare", label: "Declare" },
  ],
  EMPLOYEE: [
    { href: "/employee/today", label: "Today" },
  ],
  CUSTOMER: [
    { href: "/customer/today", label: "Today" },
  ],
};

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name?: string; role?: string; email?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    const port = typeof window !== "undefined" ? window.location.port : "";
    document.cookie = "auth_token=; path=/; max-age=0";
    if (port) document.cookie = `auth_token_${port}=; path=/; max-age=0`;
    router.push("/login");
  }

  const role = user?.role || "";
  const navItems = NAV_BY_ROLE[role] || [];

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-base font-black tracking-[-0.04em] text-[var(--ink-primary)]">CANTEEN</span>
          <div className="w-1.5 h-1.5 bg-amnex-blue rounded-full" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                pathname === item.href
                  ? "bg-amnex-blue/10 text-amnex-blue"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-white/5"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {user && (
            <>
              <span className="hidden sm:block text-xs text-[var(--ink-muted)] truncate max-w-[120px]">
                {user.name || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest text-[var(--ink-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Out</span>
              </button>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-white/5"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-white/5 bg-[var(--surface-bg)] px-4 py-3 space-y-1"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                pathname === item.href
                  ? "bg-amnex-blue/10 text-amnex-blue"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-white/5"
              )}
            >
              {item.label}
            </Link>
          ))}
        </motion.div>
      )}
    </header>
  );
}
