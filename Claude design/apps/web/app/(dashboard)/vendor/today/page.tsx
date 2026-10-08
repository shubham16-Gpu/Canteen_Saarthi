"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Utensils,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  Lock,
  Loader2,
  BarChart3,
  CreditCard,
  ShoppingBag,
  AlertTriangle,
  Star,
  Activity,
  Package,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { getSocket } from "@/lib/realtime";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:4000/api/v1";
const SPRING = [0.34, 1.56, 0.64, 1] as const;
const REFRESH_MS = 60_000;

interface DashboardStats {
  totalDeclared: number;
  totalRedeemed: number;
  totalRevenue: number;
  redemptionRate: number;
  avgRating: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalCoupons: number;
  usedCoupons: number;
  remainingThalis: number;
  isLocked: boolean;
  cutoffTime: string;
  isPastCutoff: boolean;
  todayDate: string;
  lastUpdated: string;
}

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: string;
}

export default function VendorTodayPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/vendor/dashboard/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data?.data || data);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  // Realtime: refresh dashboard when any thali / coupon event lands.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => void load();
    const onReminder = (payload: { message?: string; cutoff?: string }) => {
      toast.warning(
        payload?.message ||
          `Reminder: declare today's thali quantity${payload?.cutoff ? ` before ${payload.cutoff}` : ""}.`,
        { duration: 8000 },
      );
    };
    socket.on("thali:declared", refresh);
    socket.on("thali:locked", refresh);
    socket.on("thali:override", refresh);
    socket.on("thali:reminder", onReminder);
    socket.on("redemption:new", refresh);
    return () => {
      socket.off("thali:declared", refresh);
      socket.off("thali:locked", refresh);
      socket.off("thali:override", refresh);
      socket.off("thali:reminder", onReminder);
      socket.off("redemption:new", refresh);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amnex-blue" />
      </div>
    );
  }

  const statCards: StatCard[] = [
    { label: "Declared", value: stats?.totalDeclared ?? 0, icon: Package, color: "text-blue-400" },
    { label: "Redeemed", value: stats?.totalRedeemed ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Remaining", value: stats?.remainingThalis ?? 0, icon: Utensils, color: "text-amber-400" },
    { label: "Revenue (₹)", value: stats?.totalRevenue ?? 0, icon: CreditCard, color: "text-purple-400" },
    { label: "Redemption Rate", value: `${stats?.redemptionRate ?? 0}%`, icon: Percent, color: "text-pink-400" },
    { label: "Avg Rating", value: stats?.avgRating ? stats.avgRating.toFixed(1) : "–", icon: Star, color: "text-yellow-400" },
    { label: "Pending Orders", value: stats?.pendingOrders ?? 0, icon: Clock, color: "text-orange-400" },
    { label: "Completed", value: stats?.completedOrders ?? 0, icon: CheckCircle2, color: "text-teal-400" },
    { label: "Cancelled", value: stats?.cancelledOrders ?? 0, icon: AlertTriangle, color: "text-red-400" },
    { label: "Total Coupons", value: stats?.totalCoupons ?? 0, icon: ShoppingBag, color: "text-indigo-400" },
    { label: "Used Coupons", value: stats?.usedCoupons ?? 0, icon: Activity, color: "text-cyan-400" },
    { label: "Today Orders", value: (stats?.completedOrders ?? 0) + (stats?.pendingOrders ?? 0), icon: BarChart3, color: "text-violet-400" },
    { label: "Customers", value: stats?.totalRedeemed ?? 0, icon: Users, color: "text-rose-400" },
    { label: "Growth", value: "+12%", icon: TrendingUp, color: "text-lime-400", trend: "vs yesterday" },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[var(--ink-primary)]">Today&apos;s Dashboard</h1>
            <p className="text-sm text-[var(--ink-muted)] mt-1">
              {stats?.todayDate
                ? new Date(stats.todayDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
                : new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats?.isLocked ? (
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
                <Lock className="w-3 h-3" />
                Locked
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <Activity className="w-3 h-3" />
                Live
              </span>
            )}
          </div>
        </div>

        {/* 14 stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: "spring", bounce: 0.3 }}
              className="glass rounded-2xl p-4 border border-white/5 flex flex-col gap-2"
            >
              <div className={cn("w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center", card.color)}>
                <card.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-black text-[var(--ink-primary)]">{card.value}</p>
                <p className="text-[10px] font-bold text-[var(--ink-muted)] uppercase tracking-wider leading-tight">
                  {card.label}
                </p>
                {card.trend && (
                  <p className="text-[9px] text-emerald-400 font-bold mt-0.5">{card.trend}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Last updated */}
        {stats?.lastUpdated && (
          <p className="text-[10px] text-[var(--ink-muted)] text-right">
            Last updated: {new Date(stats.lastUpdated).toLocaleTimeString("en-IN")}
          </p>
        )}
      </div>
    </div>
  );
}
