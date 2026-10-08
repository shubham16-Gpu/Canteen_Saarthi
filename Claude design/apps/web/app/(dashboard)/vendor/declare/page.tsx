"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ClipboardCheck,
  Lock,
  Loader2,
  Save,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getSocket } from "@/lib/realtime";

const API_BASE = "http://localhost:4000/api/v1";

interface Declaration {
  id: string;
  date: string;
  quantity: number;
  locked: boolean;
  isLate?: boolean;
  createdAt: string;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function VendorDeclarePage() {
  const router = useRouter();
  const [today, setToday] = useState<Declaration | null>(null);
  const [history, setHistory] = useState<Declaration[]>([]);
  const [quantity, setQuantity] = useState<string>("");
  const [cutoff, setCutoff] = useState<string>("09:00");
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const past = useMemo(() => {
    const [h, m] = cutoff.split(":").map(Number);
    const now = new Date();
    return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
  }, [cutoff]);

  const locked = today?.locked ?? false;

  const loadAll = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const [todayRes, histRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/thali/declaration/${todayISO()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/thali/declarations?limit=7`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/thali/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (todayRes.status === 401 || histRes.status === 401) {
        router.push("/login");
        return;
      }

      if (todayRes.ok) {
        const d = await todayRes.json();
        const decl = d?.data || d;
        if (decl?.id) {
          setToday(decl);
          setQuantity(String(decl.quantity));
        }
      }
      if (histRes.ok) {
        const h = await histRes.json();
        setHistory(Array.isArray(h?.data) ? h.data : Array.isArray(h) ? h : []);
      }
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        const c = s?.data?.cutoffTime || s?.cutoffTime;
        if (c) setCutoff(c);
      }
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: refresh on thali events emitted from the API.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleDeclared = () => void loadAll();
    const handleLocked = () => void loadAll();
    const handleReminder = (payload: { message?: string; cutoff?: string }) => {
      toast.warning(
        payload?.message || `Reminder: declare today's thali quantity${payload?.cutoff ? ` before ${payload.cutoff}` : ""}.`,
        { duration: 8000 },
      );
    };
    socket.on("thali:declared", handleDeclared);
    socket.on("thali:locked", handleLocked);
    socket.on("thali:override", handleDeclared);
    socket.on("thali:reminder", handleReminder);
    return () => {
      socket.off("thali:declared", handleDeclared);
      socket.off("thali:locked", handleLocked);
      socket.off("thali:override", handleDeclared);
      socket.off("thali:reminder", handleReminder);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    setSaving(true);
    const token = localStorage.getItem("auth_token");
    try {
      const res = await fetch(`${API_BASE}/vendor/thali/declare`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          date: todayISO(),
          quantity: qty,
        }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "Failed to save declaration");
        return;
      }
      toast.success(past ? "Late declaration saved" : "Declaration saved");
      await loadAll();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amnex-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] p-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-6 h-6 text-amnex-blue" />
          <div>
            <h1 className="text-2xl font-black text-[var(--ink-primary)]">Declare Today&apos;s Thali</h1>
            <p className="text-sm text-[var(--ink-muted)]">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              {" · "}Cutoff: {cutoff}
            </p>
          </div>
        </div>

        {/* Current status */}
        <div className="glass rounded-2xl p-6 border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              locked
                ? "bg-red-500/20 text-red-400"
                : today
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-white/5 text-[var(--ink-muted)]"
            )}>
              {locked ? <Lock className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-black text-[var(--ink-primary)]">
                {locked
                  ? `Locked at ${today?.quantity ?? 0} thalis`
                  : today
                  ? `Declared: ${today.quantity} thalis`
                  : "Not yet declared"}
              </p>
              <p className="text-xs text-[var(--ink-muted)]">
                {locked ? "Declaration is finalized" : past ? "Past cutoff" : "Open for updates"}
              </p>
            </div>
          </div>

          {!locked && (
            <div className="space-y-3">
              {past && (
                <div className="flex items-center gap-2 border border-amber-200 bg-amber-50/60 rounded-xl px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-[11px] font-bold text-amber-800">
                    Past the {cutoff} cutoff. Declarations are still accepted but flagged late.
                  </p>
                </div>
              )}
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)]">
                Quantity (thalis)
              </label>
              <div className="flex flex-wrap gap-3">
                <input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 120"
                  className={cn(
                    "w-48 px-4 py-3 bg-white border rounded-xl text-2xl font-black text-[var(--ink)] outline-none",
                    past
                      ? "border-amber-300 focus:border-amber-600"
                      : "border-[var(--glass-border)] focus:border-amnex-blue",
                  )}
                />
                <button
                  onClick={() => submit()}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl btn-primary-3d text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {past ? "Submit Late Declaration" : "Save Declaration"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="glass rounded-2xl p-6 border border-white/5">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)] mb-4">
              Recent Declarations
            </h2>
            <div className="space-y-2">
              {history.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-[var(--ink-primary)]">{d.date}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[var(--ink-primary)]">{d.quantity} thalis</span>
                    {d.locked && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Locked</span>
                    )}
                    {d.isLate && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Late</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
