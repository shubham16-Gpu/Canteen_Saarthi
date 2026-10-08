"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Store,
  ChefHat,
  CreditCard,
  ShoppingBag,
  BarChart3,
  Settings,
  Users,
  UtensilsCrossed,
  Package,
  LogOut,
  Bell,
  Menu,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    group: "Operations",
    items: [
      { label: "Vendor Portal", href: "/vendor", icon: Store },
      { label: "Kitchen Display", href: "/kitchen", icon: ChefHat },
      { label: "Cashier POS", href: "/cashier", icon: CreditCard },
    ],
  },
  {
    group: "Customer",
    items: [{ label: "Order Food", href: "/customer", icon: ShoppingBag }],
  },
  {
    group: "Management",
    items: [
      { label: "Menu Items", href: "/menu", icon: UtensilsCrossed },
      { label: "Inventory", href: "/inventory", icon: Package },
      { label: "Users", href: "/users", icon: Users },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    document.cookie = "auth_token=; path=/; max-age=0";
    router.push("/login");
  };

  const Sidebar = () => (
    <aside className="w-64 h-full flex flex-col bg-amnex-navy border-r border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 data-fabric-pattern opacity-10 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amnex-blue/10 to-transparent pointer-events-none" />

      <div className="relative z-10 p-6 border-b border-white/5">
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black tracking-[-0.05em] text-white">CANTEEN</span>
          <div className="w-1.5 h-1.5 bg-amnex-blue rounded-full mb-1 ml-0.5" />
        </div>
        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">
          Management Portal
        </p>
      </div>

      <nav className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-4">
        {NAV.map((group) => (
          <div key={group.group} className="mb-6">
            <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] px-3 mb-2">
              {group.group}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all relative",
                        active
                          ? "bg-amnex-blue/15 text-white border border-amnex-blue/30 shadow-lg shadow-amnex-blue/10"
                          : "text-white/40 hover:text-white/80 hover:bg-white/5 border border-transparent",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amnex-blue rounded-r-full" />
                      )}
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {user && (
        <div className="relative z-10 p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="w-10 h-10 bg-gradient-to-br from-amnex-blue to-blue-700 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-lg shadow-amnex-blue/20 shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate tracking-tight">{user.name}</p>
              <p className="text-[9px] font-bold text-white/40 truncate uppercase tracking-widest">
                {user.role.replace("_", " ")}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-white/30 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <div className="flex h-screen bg-[#05070a] overflow-hidden">
      <Toaster position="top-center" richColors theme="dark" />

      <div className="hidden lg:flex shrink-0">
        <Sidebar />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-amnex-navy/95 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 lg:px-6 shrink-0 relative">
          <div className="absolute inset-0 data-fabric-pattern opacity-5 pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/5"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
              <Search className="w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent text-xs font-bold text-white placeholder:text-white/30 outline-none w-48"
              />
              <kbd className="text-[9px] font-black text-white/30 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                System Online
              </span>
            </div>
            <button className="relative p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/5">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amnex-blue rounded-full" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-amnex-blue" />
              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest hidden sm:inline">
                Secure
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#05070a] relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[40%] bg-amnex-blue/[0.04] blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10 p-4 lg:p-8 max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
