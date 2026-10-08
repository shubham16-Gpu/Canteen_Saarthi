"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  QrCode,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { getSocket } from "@/lib/realtime";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:4000/api/v1";

// Seat rows: A–H (8 rows), columns 1–6 (6 columns) = 48 seats
const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
const COLS = [1, 2, 3, 4, 5, 6] as const;

type SeatStatus = "available" | "occupied" | "reserved" | "mine";

interface Seat {
  id: string;
  status: SeatStatus;
}

interface ThaliInfo {
  available: boolean;
  quantity: number;
  remaining: number;
  cutoff: string;
  locked: boolean;
}

export default function EmployeeTodayPage() {
  const [seats, setSeats] = useState<Record<string, SeatStatus>>({});
  const [thali, setThali] = useState<ThaliInfo | null>(null);
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const loadData = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const [seatsRes, thaliRes] = await Promise.all([
        fetch(`${API_BASE}/thali/seats/today`, { headers }),
        fetch(`${API_BASE}/thali/today`, { headers }),
      ]);

      if (seatsRes.ok) {
        const seatData = await seatsRes.json();
        const seatMap: Record<string, SeatStatus> = {};
        const list: Seat[] = seatData?.data || seatData || [];
        list.forEach((s) => {
          seatMap[s.id] = s.status;
        });
        setSeats(seatMap);
      }

      if (thaliRes.ok) {
        const thaliData = await thaliRes.json();
        setThali(thaliData?.data || thaliData);
      }
    } catch {
      // silently ignore network errors on polling
    } finally {
      setLoadingSeats(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Per-second tick for countdown.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Realtime: refresh seat grid + lunch CTA when vendor declares / locks.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onThali = (payload: { declaration?: { quantity?: number }; date?: string }) => {
      const qty = payload?.declaration?.quantity;
      toast.success(
        typeof qty === "number"
          ? `Today's thali count updated to ${qty}.`
          : "Today's thali count updated.",
        { duration: 5000 },
      );
      // Bump tick so countdowns / availability re-derive without full reload.
      setTick((n) => n + 1);
    };
    socket.on("thali:declared", onThali);
    socket.on("thali:locked", onThali);
    socket.on("thali:override", onThali);
    return () => {
      socket.off("thali:declared", onThali);
      socket.off("thali:locked", onThali);
      socket.off("thali:override", onThali);
    };
  }, []);

  const handleBookSeat = async (seatId: string) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      toast.error("Please log in to book a seat.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/thali/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seatId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBookingId(data.data?.id || seatId);
        setSeats((prev) => ({ ...prev, [seatId]: "mine" }));
        toast.success(`Seat ${seatId} booked!`);
      } else {
        toast.error(data.message || "Booking failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const getSeatColor = (status: SeatStatus) => {
    switch (status) {
      case "mine": return "bg-amnex-blue border-amnex-blue/60 text-white shadow-lg shadow-amnex-blue/20";
      case "occupied": return "bg-red-500/20 border-red-500/30 text-red-400 cursor-not-allowed";
      case "reserved": return "bg-amber-500/20 border-amber-500/30 text-amber-400 cursor-not-allowed";
      default: return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer";
    }
  };

  const totalSeats = ROWS.length * COLS.length; // 48
  const occupiedCount = Object.values(seats).filter((s) => s === "occupied" || s === "mine" || s === "reserved").length;

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-[var(--ink-primary)]">Today&apos;s Lunch</h1>
          <p className="text-sm text-[var(--ink-muted)] mt-1">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Thali status */}
        {thali && (
          <div className={cn(
            "glass rounded-2xl p-5 border",
            thali.available ? "border-emerald-500/20" : "border-white/5"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  thali.available ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-[var(--ink-muted)]"
                )}>
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-[var(--ink-primary)]">
                    {thali.available ? `${thali.remaining} thalis remaining` : "Thali not available today"}
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">Cutoff: {thali.cutoff}</p>
                </div>
              </div>
              {thali.available && !thali.locked && (
                <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Open</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Seat grid */}
        <div className="glass rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-[var(--ink-primary)] text-sm uppercase tracking-widest">
              Seating (8×6 — {totalSeats} seats)
            </h2>
            <span className="text-xs text-[var(--ink-muted)]">
              {occupiedCount}/{totalSeats} occupied
            </span>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-4">
            {[
              { color: "bg-emerald-500/20 border-emerald-500/20", label: "Available" },
              { color: "bg-amnex-blue/30 border-amnex-blue/40", label: "Mine" },
              { color: "bg-red-500/20 border-red-500/30", label: "Occupied" },
              { color: "bg-amber-500/20 border-amber-500/30", label: "Reserved" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={cn("w-3 h-3 rounded border", color)} />
                <span className="text-[10px] text-[var(--ink-muted)]">{label}</span>
              </div>
            ))}
          </div>

          {loadingSeats ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-amnex-blue" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Column headers */}
              <div className="flex gap-2 mb-2 pl-8">
                {COLS.map((col) => (
                  <div key={col} className="w-10 text-center text-[10px] font-black text-[var(--ink-muted)] uppercase">
                    {col}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {ROWS.map((row) => (
                <div key={row} className="flex items-center gap-2 mb-2">
                  <div className="w-6 text-[10px] font-black text-[var(--ink-muted)]">{row}</div>
                  {COLS.map((col) => {
                    const seatId = `${row}${col}`;
                    const status = seats[seatId] || "available";
                    const isBooked = bookingId === seatId;
                    return (
                      <motion.button
                        key={seatId}
                        whileHover={{ scale: status === "available" ? 1.05 : 1 }}
                        whileTap={{ scale: status === "available" ? 0.95 : 1 }}
                        disabled={status !== "available"}
                        onClick={() => status === "available" && handleBookSeat(seatId)}
                        className={cn(
                          "w-10 h-10 rounded-lg border text-[10px] font-black transition-all",
                          getSeatColor(status)
                        )}
                        title={seatId}
                      >
                        {status === "mine" && <CheckCircle2 className="w-3.5 h-3.5 mx-auto" />}
                        {status !== "mine" && seatId}
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Booking confirmation */}
        {bookingId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 border border-emerald-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="font-black text-[var(--ink-primary)]">Seat {bookingId} Booked</h3>
            </div>
            <p className="text-sm text-[var(--ink-muted)] mb-4">
              Show this at the canteen counter.
            </p>
            <div className="flex items-center justify-center bg-white rounded-xl p-4 w-fit mx-auto">
              <QrCode className="w-24 h-24 text-[#001b3d]" />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
