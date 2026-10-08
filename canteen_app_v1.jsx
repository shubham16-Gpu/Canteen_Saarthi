import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Utensils, QrCode, Calendar, Clock, Users, UserPlus, ShieldCheck,
  AlertTriangle, CheckCircle2, XCircle, ChevronRight, ChevronLeft, Settings,
  Bell, FileText, BarChart3, RefreshCw, Search, Plus, Minus, LogOut,
  Coffee, MessageSquare, Camera, Send, Eye, EyeOff, Hash, Phone,
  Building2, ClipboardList, TrendingUp, Sparkles, Menu, X, ArrowRight,
  CircleDot, Check, Trash2, Edit3, Download, Filter, ChevronDown,
  Briefcase, Lock, Unlock, AlertCircle, History, Zap, Receipt, Home as HomeIcon,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════
// AMNEX THEME — navy + white corporate
// ═══════════════════════════════════════════════════════════════════════
const T = {
  navy: "#1a2456",        // primary brand
  navyDeep: "#0f1838",    // hover/active
  navySoft: "#e6e9f2",    // tinted backgrounds
  navyLine: "#c8cee0",    // borders on tinted
  ink: "#1a2030",         // primary text
  body: "#4a5168",        // body text
  muted: "#7a8094",       // secondary text
  bg: "#f5f6fa",          // page background
  card: "#ffffff",
  rule: "#e3e6ee",        // dividers
  green: "#2e7d4f",
  greenSoft: "#e0eee5",
  red: "#b22a2a",
  redSoft: "#f4dede",
  amber: "#a06b00",
  amberSoft: "#fbeed1",
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
};

// ═══════════════════════════════════════════════════════════════════════
// PERSISTENT STORE — debounced, queued writes
// ═══════════════════════════════════════════════════════════════════════
const DB_KEY = "amnex_canteen_v2";

const seedDB = () => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    today,
    config: {
      bookingOpenHour: 10,
      cancellationCutoffMinutes: 30,
      feedbackWindowHours: 30,
      vendorQuantityDeadline: "09:00",
      occupancyCapacity: 120,
    },
    vendor: {
      todayQuantity: 80,
      quantitySetAt: `${today}T08:42:00`,
      quantityNote: "",
    },
    coupons: [
      { id: "CPN-1042", type: "employee", userId: "EMP-204", name: "Anjali Sharma", slot: "13:00", status: "redeemed", date: today, code: "8KQ2", redeemedAt: `${today}T13:11:00` },
      { id: "CPN-1043", type: "employee", userId: "EMP-118", name: "Rohan Mehta", slot: "12:30", status: "booked", date: today, code: "3FP9" },
      { id: "CPN-1044", type: "visitor", userId: "VIS-77", name: "Priya Nair", company: "Acme Corp", host: "EMP-204", slot: "13:15", status: "booked", date: today, code: "1ZX4", sponsoredBy: "ADMIN-01" },
      { id: "CPN-1045", type: "employee", userId: "EMP-302", name: "Vikram Singh", slot: "12:30", status: "redeemed", date: today, code: "7TY1", redeemedAt: `${today}T12:38:00` },
      { id: "CPN-1046", type: "employee", userId: "EMP-411", name: "Meera Iyer", slot: "13:00", status: "cancelled", date: today, code: "5RB6" },
    ],
    waitlist: [],
    vendorStaff: [
      { id: "VST-01", name: "Ramesh Kumar", role: "Cook", govId: "XXXX-XXXX-3421", phone: "98xxx-xxx21", status: "approved", onDutyToday: true, entryAt: `${today}T07:55:00`, exitAt: null },
      { id: "VST-02", name: "Sunita Devi", role: "Server", govId: "XXXX-XXXX-9012", phone: "97xxx-xxx88", status: "approved", onDutyToday: true, entryAt: `${today}T08:02:00`, exitAt: null },
      { id: "VST-03", name: "Arjun Patel", role: "Cleaner", govId: "XXXX-XXXX-1138", phone: "96xxx-xxx14", status: "approved", onDutyToday: false, entryAt: null, exitAt: null },
      { id: "VST-04", name: "Lakshmi Menon", role: "Helper", govId: "XXXX-XXXX-7766", phone: "95xxx-xxx02", status: "pending", onDutyToday: false, entryAt: null, exitAt: null },
    ],
    feedback: [
      { id: "FB-01", couponId: "CPN-1042", userId: "EMP-204", rating: 4, comment: "Dal was good today, rice slightly overcooked.", createdAt: `${today}T13:30:00` },
    ],
    complaints: [
      { id: "CMP-01", userId: "EMP-302", category: "hygiene", severity: "high", description: "Found a hair on the plate.", evidence: "photo_001.jpg", status: "in_progress", createdAt: `${today}T12:45:00`, response: null },
    ],
    refunds: [],
    occupancyLog: [
      { time: "12:00", count: 22 }, { time: "12:15", count: 41 }, { time: "12:30", count: 68 },
      { time: "12:45", count: 89 }, { time: "13:00", count: 95 }, { time: "13:15", count: 72 },
    ],
    audit: [
      { id: "A-1", at: `${today}T08:42:00`, actor: "VENDOR-1", action: "Set daily thali quantity", detail: "80 thalis declared" },
      { id: "A-2", at: `${today}T10:00:00`, actor: "SYSTEM", action: "Booking opened", detail: "Coupon pool: 80" },
      { id: "A-3", at: `${today}T10:14:00`, actor: "ADMIN-01", action: "Sponsored visitor coupon", detail: "Priya Nair / Acme Corp" },
    ],
    notifications: [
      { id: "N-1", at: `${today}T10:00:00`, role: "employee", title: "Booking is now open", body: "80 thalis available today." },
    ],
    currentUser: null,
  };
};

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════
const fmtTime = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
};
const nowIso = () => new Date().toISOString();
const rand = (n = 4) => Math.random().toString(36).slice(2, 2 + n).toUpperCase();
const newId = (p) => `${p}-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
const countStatus = (coupons, status, date) =>
  coupons.filter(c => c.date === date && (Array.isArray(status) ? status.includes(c.status) : c.status === status)).length;
const audit = (db, actor, action, detail) => ({
  ...db,
  audit: [{ id: newId("A"), at: nowIso(), actor, action, detail }, ...db.audit].slice(0, 100),
});
const notify = (db, role, title, body) => ({
  ...db,
  notifications: [{ id: newId("N"), at: nowIso(), role, title, body }, ...db.notifications].slice(0, 30),
});

// ═══════════════════════════════════════════════════════════════════════
// QR GLYPH (deterministic, local-only, no network)
// ═══════════════════════════════════════════════════════════════════════
function QRGlyph({ value, size = 180 }) {
  const grid = 21;
  const cell = size / grid;
  const cells = useMemo(() => {
    let h = 0;
    for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
    const arr = [];
    let s = h >>> 0;
    for (let i = 0; i < grid * grid; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      arr.push((s & 1) === 1);
    }
    return arr;
  }, [value]);

  const isFinder = (r, c) => {
    const inBox = (r1, c1) => r >= r1 && r < r1 + 7 && c >= c1 && c < c1 + 7;
    return inBox(0, 0) || inBox(0, grid - 7) || inBox(grid - 7, 0);
  };
  const finderFill = (r, c) => {
    const local = (r1, c1) => {
      const lr = r - r1, lc = c - c1;
      if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
      if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
      return false;
    };
    if (r < 7 && c < 7) return local(0, 0);
    if (r < 7 && c >= grid - 7) return local(0, grid - 7);
    if (r >= grid - 7 && c < 7) return local(grid - 7, 0);
    return false;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: "#fff", borderRadius: 6 }}>
      {cells.map((on, i) => {
        const r = Math.floor(i / grid), c = i % grid;
        const fill = isFinder(r, c) ? finderFill(r, c) : on;
        if (!fill) return null;
        return <rect key={i} x={c * cell} y={r * cell} width={cell} height={cell} fill={T.navy} />;
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════
function Pill({ tone = "muted", children }) {
  const tones = {
    navy: { bg: T.navySoft, fg: T.navy },
    green: { bg: T.greenSoft, fg: T.green },
    red: { bg: T.redSoft, fg: T.red },
    amber: { bg: T.amberSoft, fg: T.amber },
    muted: { bg: "#eef0f4", fg: T.muted },
  };
  const s = tones[tone] || tones.muted;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.fg, letterSpacing: 0.3,
      whiteSpace: "nowrap", textTransform: "uppercase",
    }}>{children}</span>
  );
}

function Card({ children, style, onClick, accent }) {
  return (
    <div onClick={onClick} style={{
      background: T.card,
      borderRadius: 6,
      border: `1px solid ${T.rule}`,
      borderLeft: accent ? `3px solid ${T.navy}` : `1px solid ${T.rule}`,
      padding: 18,
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}>{children}</div>
  );
}

function Btn({ children, onClick, variant = "primary", icon: Icon, disabled, full, small, type = "button" }) {
  const v = {
    primary: { bg: T.navy, fg: "#fff", border: T.navy, hover: T.navyDeep },
    accent: { bg: T.navy, fg: "#fff", border: T.navy, hover: T.navyDeep },
    ghost: { bg: "transparent", fg: T.navy, border: T.navyLine, hover: T.navySoft },
    danger: { bg: T.red, fg: "#fff", border: T.red, hover: "#8a1f1f" },
    soft: { bg: T.bg, fg: T.ink, border: T.rule, hover: "#eef0f4" },
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: small ? "6px 12px" : "10px 18px",
        borderRadius: 4,
        border: `1px solid ${v.border}`,
        background: v.bg, color: v.fg,
        fontFamily: T.sans, fontSize: small ? 12 : 13, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        width: full ? "100%" : "auto",
        letterSpacing: 0.2,
        transition: "background 120ms",
      }}
      onMouseOver={(e) => { if (!disabled) e.currentTarget.style.background = v.hover; }}
      onMouseOut={(e) => { if (!disabled) e.currentTarget.style.background = v.bg; }}
    >
      {Icon && <Icon size={small ? 13 : 15} />}
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.body, marginBottom: 5, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      {children}
    </label>
  );
}
function Input(p) {
  return <input {...p} style={{
    width: "100%", padding: "9px 12px", borderRadius: 4,
    border: `1px solid ${T.rule}`, background: "#fff",
    fontFamily: T.sans, fontSize: 14, color: T.ink, outline: "none",
    boxSizing: "border-box",
    ...p.style,
  }} />;
}
function TextArea(p) {
  return <textarea {...p} style={{
    width: "100%", padding: "9px 12px", borderRadius: 4,
    border: `1px solid ${T.rule}`, background: "#fff",
    fontFamily: T.sans, fontSize: 14, color: T.ink, outline: "none",
    minHeight: 80, resize: "vertical", boxSizing: "border-box",
    ...p.style,
  }} />;
}
function Sel(p) {
  return <select {...p} style={{
    width: "100%", padding: "9px 12px", borderRadius: 4,
    border: `1px solid ${T.rule}`, background: "#fff",
    fontFamily: T.sans, fontSize: 14, color: T.ink, outline: "none",
    boxSizing: "border-box",
    ...p.style,
  }} />;
}

function Stat({ label, value, hint, tone = "ink" }) {
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
      <div style={{
        fontSize: 30, fontWeight: 600,
        color: tone === "accent" ? T.navy : T.ink,
        lineHeight: 1.1, marginTop: 6, fontFamily: T.sans,
      }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{hint}</div>}
    </Card>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, marginTop: 4, gap: 10, flexWrap: "wrap" }}>
      <h2 style={{
        fontSize: 18, fontWeight: 700, color: T.navy, margin: 0,
        letterSpacing: 0.2, paddingLeft: 10, borderLeft: `3px solid ${T.navy}`,
        textTransform: "uppercase",
      }}>{children}</h2>
      {action}
    </div>
  );
}

function Empty({ icon: Icon = ClipboardList, title, hint }) {
  return (
    <div style={{
      textAlign: "center", padding: "30px 18px", color: T.muted,
      border: `1px dashed ${T.rule}`, borderRadius: 6, background: "#fafbfd",
    }}>
      <Icon size={26} style={{ opacity: 0.5 }} />
      <div style={{ fontSize: 15, color: T.ink, marginTop: 8, fontWeight: 600 }}>{title}</div>
      {hint && <div style={{ fontSize: 13, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Modal({ open, onClose, title, children, footer, wide }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,24,56,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 14,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.card, borderRadius: 6, width: "100%",
        maxWidth: wide ? 640 : 460, maxHeight: "92vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 18px 50px rgba(15,24,56,0.25)",
      }}>
        <div style={{
          padding: "14px 20px", borderBottom: `1px solid ${T.rule}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: T.navy, borderRadius: "6px 6px 0 0",
        }}>
          <h3 style={{ fontSize: 15, margin: 0, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex", padding: 0 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: 14, borderTop: `1px solid ${T.rule}`, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// OCCUPANCY CHART
// ═══════════════════════════════════════════════════════════════════════
function OccupancyChart({ log, capacity }) {
  const w = 600, h = 160, p = 28;
  const max = Math.max(capacity, ...log.map(l => l.count));
  const xStep = (w - p * 2) / Math.max(1, log.length - 1);
  const points = log.map((l, i) => `${p + i * xStep},${h - p - (l.count / max) * (h - p * 2)}`).join(" ");
  const area = `${p},${h - p} ${points} ${p + (log.length - 1) * xStep},${h - p}`;
  const last = log[log.length - 1];
  const pct = last ? Math.round((last.count / capacity) * 100) : 0;
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>Now</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>
            {last?.count ?? 0} <span style={{ fontSize: 14, color: T.muted, fontWeight: 400 }}>/ {capacity}</span>
          </div>
        </div>
        <Pill tone={pct > 80 ? "red" : pct > 50 ? "amber" : "green"}>{pct}% full</Pill>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="160" style={{ display: "block" }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="occ" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={T.navy} stopOpacity="0.25" />
            <stop offset="100%" stopColor={T.navy} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#occ)" />
        <polyline points={points} fill="none" stroke={T.navy} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {log.map((l, i) => (
          <g key={i}>
            <circle cx={p + i * xStep} cy={h - p - (l.count / max) * (h - p * 2)} r="3.5" fill="#fff" stroke={T.navy} strokeWidth="2" />
            <text x={p + i * xStep} y={h - 6} fontSize="10" fill={T.muted} textAnchor="middle">{l.time}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COUPON TABLE
// ═══════════════════════════════════════════════════════════════════════
function CouponTable({ coupons, onCancel }) {
  if (!coupons.length) return <Empty icon={Receipt} title="No coupons" />;
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${T.rule}`, borderRadius: 6, background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
        <thead>
          <tr style={{ background: T.navy, color: "#fff", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6 }}>
            <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700 }}>ID</th>
            <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700 }}>Person</th>
            <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700 }}>Type</th>
            <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700 }}>Slot</th>
            <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700 }}>Status</th>
            {onCancel && <th style={{ padding: "10px 14px", fontWeight: 700 }}></th>}
          </tr>
        </thead>
        <tbody>
          {coupons.map((c, i) => (
            <tr key={c.id} style={{ borderTop: `1px solid ${T.rule}`, fontSize: 13, background: i % 2 ? "#fafbfd" : "#fff" }}>
              <td style={{ padding: "9px 14px", fontFamily: "ui-monospace, monospace", fontSize: 11, color: T.body }}>{c.id}</td>
              <td style={{ padding: "9px 14px", color: T.ink, fontWeight: 500 }}>{c.name}{c.company && <span style={{ color: T.muted, fontWeight: 400, fontSize: 12 }}> · {c.company}</span>}</td>
              <td style={{ padding: "9px 14px", color: T.body, textTransform: "capitalize" }}>{c.type}</td>
              <td style={{ padding: "9px 14px", color: T.body }}>{c.slot}</td>
              <td style={{ padding: "9px 14px" }}>
                <Pill tone={c.status === "redeemed" ? "green" : c.status === "booked" ? "navy" : "muted"}>{c.status}</Pill>
              </td>
              {onCancel && (
                <td style={{ padding: "9px 14px" }}>
                  {c.status === "booked" && (
                    <button onClick={() => onCancel(c.id)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>cancel</button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// AI SIGNALS
// ═══════════════════════════════════════════════════════════════════════
function AISignals({ db }) {
  const issued = countStatus(db.coupons, ["booked", "redeemed"], db.today);
  const onPool = db.vendor.todayQuantity || 0;
  const fillRate = onPool ? Math.round((issued / onPool) * 100) : 0;
  const noShow = countStatus(db.coupons, "cancelled", db.today);
  const signals = [
    {
      icon: TrendingUp,
      title: fillRate > 90 ? "Demand spike" : fillRate > 60 ? "Steady demand" : "Soft demand",
      detail: `Fill rate ${fillRate}%. Suggested pool tomorrow: ${Math.max(60, Math.round(onPool * (fillRate > 90 ? 1.1 : fillRate < 50 ? 0.9 : 1)))}.`,
    },
    {
      icon: Users,
      title: "Crowd peak forecast",
      detail: "Highest occupancy expected at 12:45–13:00 based on today's curve.",
    },
    {
      icon: AlertTriangle,
      title: "No-show trend",
      detail: `${noShow} cancellations today. ${noShow > 2 ? "Above average." : "Within normal range."}`,
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {signals.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} style={{ display: "flex", gap: 10, padding: 10, background: T.bg, borderRadius: 4, border: `1px solid ${T.rule}` }}>
            <div style={{
              width: 30, height: 30, borderRadius: 4, background: T.navy,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}><Icon size={14} color="#fff" /></div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: T.ink }}>{s.title}</div>
              <div style={{ fontSize: 12, color: T.body, marginTop: 2, lineHeight: 1.4 }}>{s.detail}</div>
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 10, color: T.muted, fontStyle: "italic", marginTop: 4 }}>
        <Sparkles size={10} style={{ verticalAlign: "middle" }} /> Advisory only — does not block operations.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ROLES
// ═══════════════════════════════════════════════════════════════════════
const ROLES = [
  { id: "employee", label: "Employee", desc: "Book lunch, view coupons, give feedback", icon: Coffee, user: { id: "EMP-118", name: "Rohan Mehta" } },
  { id: "vendor", label: "Vendor", desc: "Set quantity, scan QRs, manage staff", icon: Utensils, user: { id: "VENDOR-1", name: "Sai Kitchens Pvt Ltd" } },
  { id: "admin", label: "Admin", desc: "Visitors, refunds, complaints, audit", icon: ShieldCheck, user: { id: "ADMIN-01", name: "Neha Krishnan" } },
  { id: "superadmin", label: "Super Admin", desc: "System rules and reports", icon: Settings, user: { id: "SADMIN-01", name: "K. Raghavan" } },
  { id: "visitor", label: "Visitor", desc: "Open SMS QR coupon link", icon: UserPlus, user: { id: "VIS-77", name: "Priya Nair" } },
];

// ═══════════════════════════════════════════════════════════════════════
// LANDING / ROLE PICKER (AMNEX template style)
// ═══════════════════════════════════════════════════════════════════════
function RoleLanding({ onPick }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#fff",
      fontFamily: T.sans, color: T.ink,
      display: "flex", flexDirection: "column",
    }}>
      {/* Header bar */}
      <div style={{
        padding: "16px 24px",
        borderBottom: `1px solid ${T.rule}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: T.navy, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Utensils size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, letterSpacing: 0.5 }}>AMNEX CANTEEN</div>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: 0.6, textTransform: "uppercase" }}>Operations Platform</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: T.muted, letterSpacing: 0.6, textTransform: "uppercase" }}>v1.0</div>
      </div>

      {/* Title block, AMNEX-style with navy left border */}
      <div style={{ padding: "32px 24px 8px", maxWidth: 1100, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <div style={{ borderLeft: `4px solid ${T.navy}`, paddingLeft: 16 }}>
          <h1 style={{
            fontSize: "clamp(26px, 4.5vw, 38px)", fontWeight: 700,
            color: T.navy, margin: 0, letterSpacing: -0.3, lineHeight: 1.15,
          }}>Canteen Management System</h1>
          <p style={{ fontSize: 14, color: T.body, marginTop: 8, marginBottom: 0, lineHeight: 1.5, maxWidth: 600 }}>
            Role-aware demonstration of the meal entitlement, redemption and operations platform.
            Select a role to enter the corresponding workspace.
          </p>
        </div>
      </div>

      {/* Thin navy rule */}
      <div style={{ maxWidth: 1100, width: "100%", margin: "20px auto 0", padding: "0 24px", boxSizing: "border-box" }}>
        <div style={{ height: 1, background: T.navy, opacity: 0.3 }} />
      </div>

      {/* Role grid */}
      <div style={{ flex: 1, padding: "24px", maxWidth: 1100, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}>
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                onClick={() => onPick(r)}
                style={{
                  background: "#fff",
                  border: `1px solid ${T.rule}`,
                  borderLeft: `3px solid ${T.navy}`,
                  borderRadius: 4,
                  padding: 18,
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: T.sans,
                  transition: "all 150ms ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = T.navySoft;
                  e.currentTarget.style.borderLeftWidth = "6px";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderLeftWidth = "3px";
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 4, background: T.navy,
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
                }}>
                  <Icon size={18} color="#fff" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 }}>
                  {r.label}
                </div>
                <div style={{ fontSize: 12, color: T.body, lineHeight: 1.5, marginBottom: 12 }}>{r.desc}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${T.rule}` }}>
                  <span style={{ fontSize: 10, color: T.muted, fontFamily: "ui-monospace, monospace", letterSpacing: 0.5 }}>{r.user.id}</span>
                  <ArrowRight size={14} color={T.navy} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer (AMNEX-template-style: thin rule, footer text bottom-left, vertical brand right) */}
      <div style={{ position: "relative", padding: "24px", maxWidth: 1100, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <div style={{ height: 1, background: T.navy, opacity: 0.3, marginBottom: 12 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>
          <span>Canteen Management · Demo build</span>
          <span style={{ fontWeight: 700, color: T.navy, letterSpacing: 2 }}>AMNEX</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SHELL — responsive: top bar always visible, sidebar on desktop, drawer on mobile, bottom nav on mobile
// ═══════════════════════════════════════════════════════════════════════
function Shell({ user, role, onLogout, onReset, tabs, active, setActive, children, notificationsCount = 0, isMobile }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // mobile bottom nav shows max 5 tabs; desktop has full sidebar
  const mobileTabs = tabs.slice(0, 5);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.sans, color: T.ink }}>
      {/* Top header */}
      <header style={{
        background: "#fff",
        borderBottom: `1px solid ${T.rule}`,
        padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
        gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          {isMobile && (
            <button onClick={() => setDrawerOpen(true)} style={{
              background: "none", border: "none", cursor: "pointer", color: T.navy, padding: 4, display: "flex",
            }}><Menu size={20} /></button>
          )}
          <div style={{ width: 30, height: 30, background: T.navy, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Utensils size={15} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, letterSpacing: 0.5, lineHeight: 1.1, whiteSpace: "nowrap" }}>AMNEX CANTEEN</div>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 2 }}>{role.label}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {notificationsCount > 0 && (
            <div style={{ position: "relative", color: T.navy, padding: 4 }}>
              <Bell size={18} />
              <span style={{
                position: "absolute", top: 0, right: 0, background: T.red, color: "#fff",
                borderRadius: 999, fontSize: 9, padding: "1px 5px", fontWeight: 700,
              }}>{notificationsCount}</span>
            </div>
          )}
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 4, background: T.navy, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11,
              }}>{user.name.split(" ").map(s => s[0]).slice(0, 2).join("")}</div>
              <div style={{ fontSize: 12, lineHeight: 1.1 }}>
                <div style={{ fontWeight: 600, color: T.ink }}>{user.name}</div>
                <div style={{ fontSize: 10, color: T.muted, fontFamily: "ui-monospace, monospace" }}>{user.id}</div>
              </div>
            </div>
          )}
          <button onClick={onLogout} title="Switch role" style={{
            background: "none", border: `1px solid ${T.navyLine}`, borderRadius: 4,
            padding: 6, cursor: "pointer", color: T.navy, display: "flex",
          }}><LogOut size={14} /></button>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: "flex", maxWidth: 1280, margin: "0 auto" }}>
        {!isMobile && (
          <aside style={{
            width: 220, borderRight: `1px solid ${T.rule}`, padding: "18px 12px",
            minHeight: "calc(100vh - 56px)", background: "#fff", flexShrink: 0,
          }}>
            <NavList tabs={tabs} active={active} setActive={setActive} onReset={onReset} />
          </aside>
        )}

        {isMobile && drawerOpen && (
          <div onClick={() => setDrawerOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 60, background: "rgba(15,24,56,0.5)",
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              width: 260, height: "100%", background: "#fff", padding: 16, overflowY: "auto",
              boxShadow: "2px 0 20px rgba(0,0,0,0.15)",
            }}>
              <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.rule}` }}>
                <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>Signed in</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: T.navy }}>{user.name}</div>
                <div style={{ fontSize: 11, color: T.muted, fontFamily: "ui-monospace, monospace" }}>{user.id}</div>
              </div>
              <NavList tabs={tabs} active={active} setActive={(k) => { setActive(k); setDrawerOpen(false); }} onReset={onReset} />
            </div>
          </div>
        )}

        <main style={{
          flex: 1,
          padding: isMobile ? "18px 14px 80px" : "22px 22px 40px",
          minWidth: 0,
        }}>{children}</main>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "#fff", borderTop: `1px solid ${T.rule}`,
          display: "flex", justifyContent: "space-around", padding: "6px 4px",
          zIndex: 40, paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))",
        }}>
          {mobileTabs.map(t => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button key={t.id} onClick={() => setActive(t.id)} style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "6px 4px", minWidth: 50, flex: 1,
                color: isActive ? T.navy : T.muted,
              }}>
                <Icon size={18} />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>{t.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

function NavList({ tabs, active, setActive, onReset }) {
  return (
    <>
      <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, padding: "4px 8px 8px" }}>Workspace</div>
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
            borderRadius: 4, border: "none",
            background: isActive ? T.navy : "transparent",
            color: isActive ? "#fff" : T.ink,
            cursor: "pointer", width: "100%", textAlign: "left",
            fontSize: 13, fontWeight: 500, marginBottom: 2, fontFamily: T.sans,
          }}>
            <Icon size={15} /> {t.label}
          </button>
        );
      })}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${T.rule}` }}>
        <button onClick={onReset} style={{
          display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: T.muted,
          background: "none", border: "none", cursor: "pointer", padding: "6px 12px",
          fontFamily: T.sans, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600,
        }}>
          <RefreshCw size={12} /> Reset demo data
        </button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EMPLOYEE — Today
// ═══════════════════════════════════════════════════════════════════════
function EmployeeHome({ db, update, user, toast, setTab }) {
  const [showBook, setShowBook] = useState(false);
  const [slot, setSlot] = useState("12:30");

  const myCoupon = db.coupons.find(c => c.userId === user.id && c.date === db.today && ["booked", "redeemed"].includes(c.status));
  const myWaitlist = db.waitlist.find(w => w.userId === user.id && w.date === db.today);
  const onPool = db.vendor.todayQuantity || 0;
  const issued = countStatus(db.coupons, ["booked", "redeemed"], db.today);
  const remaining = Math.max(0, onPool - issued);
  const cancelled = countStatus(db.coupons, "cancelled", db.today);
  const bookingOpen = new Date().getHours() >= db.config.bookingOpenHour;

  const book = () => {
    if (myCoupon) { toast.show("You already have a coupon for today.", "red"); return; }
    if (remaining <= 0) {
      toast.show("Sold out — added to waitlist.", "amber");
      update((cur) => {
        let next = { ...cur, waitlist: [...cur.waitlist, { id: newId("WL"), userId: user.id, name: user.name, date: cur.today, joinedAt: nowIso() }] };
        next = audit(next, user.id, "Joined waitlist", cur.today);
        return notify(next, "employee", "Added to waitlist", "We'll notify you if a coupon opens up.");
      });
      setShowBook(false);
      return;
    }
    const newCoupon = {
      id: newId("CPN"), type: "employee", userId: user.id, name: user.name,
      slot, status: "booked", date: db.today, code: rand(4),
    };
    update((cur) => {
      let next = { ...cur, coupons: [...cur.coupons, newCoupon] };
      next = notify(next, "employee", "Booking confirmed", `Coupon ${newCoupon.id} • Slot ${slot}`);
      return audit(next, user.id, "Booked lunch coupon", `${newCoupon.id} @ ${slot}`);
    });
    toast.show("Booked. QR is ready.", "green");
    setShowBook(false);
    setTab("coupon");
  };

  return (
    <>
      <SectionTitle>Hello, {user.name.split(" ")[0]}</SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 18 }}>
        <Stat label="Pool today" value={onPool} hint="Set by vendor" />
        <Stat label="Remaining" value={remaining} hint={`${issued} issued`} tone="accent" />
        <Stat label="Cancelled" value={cancelled} hint="Recycled" />
      </div>

      <Card accent>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Pill tone={myCoupon ? "green" : remaining > 0 ? "navy" : "amber"}>
              {myCoupon ? "Booked" : remaining > 0 ? "Available" : "Sold out"}
            </Pill>
            <div style={{ fontSize: 22, marginTop: 12, fontWeight: 700, lineHeight: 1.2, color: T.ink }}>
              {myCoupon ? `Lunch reserved for ${myCoupon.slot}` : bookingOpen ? "Lunch is open for booking" : `Booking opens at ${db.config.bookingOpenHour}:00`}
            </div>
            <div style={{ color: T.body, fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
              {myCoupon ? `Show your QR at the counter at ${myCoupon.slot}.` :
                remaining > 0 ? `${remaining} thalis still available. One coupon per employee per day.` :
                  myWaitlist ? `You're on the waitlist.` :
                    "Pool is empty for today."}
            </div>
          </div>
          <div>
            {myCoupon ? (
              <Btn onClick={() => setTab("coupon")} icon={QrCode}>Show QR</Btn>
            ) : remaining > 0 && bookingOpen ? (
              <Btn onClick={() => setShowBook(true)} icon={Plus} variant="accent">Book lunch</Btn>
            ) : !myWaitlist && !bookingOpen ? (
              <Btn disabled icon={Clock}>Opens 10:00</Btn>
            ) : !myWaitlist ? (
              <Btn onClick={book} icon={Plus} variant="ghost">Join waitlist</Btn>
            ) : (
              <Pill tone="amber">On waitlist</Pill>
            )}
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 18 }}>
        <SectionTitle>Live occupancy</SectionTitle>
        <Card><OccupancyChart log={db.occupancyLog} capacity={db.config.occupancyCapacity} /></Card>
      </div>

      {db.notifications.filter(n => n.role === "employee").length > 0 && (
        <div style={{ marginTop: 18 }}>
          <SectionTitle>Notifications</SectionTitle>
          {db.notifications.filter(n => n.role === "employee").slice(0, 4).map(n => (
            <Card key={n.id} style={{ marginBottom: 8, padding: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Bell size={15} color={T.navy} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: T.ink }}>{n.title}</div>
                <div style={{ fontSize: 12, color: T.body, marginTop: 2 }}>{n.body}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>{fmtTime(n.at)}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showBook} onClose={() => setShowBook(false)} title="Confirm booking"
        footer={<>
          <Btn variant="ghost" onClick={() => setShowBook(false)}>Cancel</Btn>
          <Btn onClick={book} variant="accent" icon={Check}>Confirm</Btn>
        </>}>
        <div style={{ fontSize: 13, color: T.body, marginBottom: 14, lineHeight: 1.5 }}>
          One thali, one coupon. The QR generates instantly and is valid for the slot you pick today.
        </div>
        <Field label="Dining slot">
          <Sel value={slot} onChange={(e) => setSlot(e.target.value)}>
            <option value="12:30">12:30 – 12:50</option>
            <option value="12:45">12:45 – 13:05</option>
            <option value="13:00">13:00 – 13:20</option>
            <option value="13:15">13:15 – 13:35</option>
            <option value="13:30">13:30 – 13:50</option>
          </Sel>
        </Field>
        <div style={{ background: T.greenSoft, borderRadius: 4, padding: 10, fontSize: 12, color: T.green }}>
          <CheckCircle2 size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Coupon ID and OTP are revealed only after biometric unlock.
        </div>
      </Modal>
    </>
  );
}

function EmployeeCoupon({ db, update, user, toast }) {
  const [revealOtp, setRevealOtp] = useState(false);
  const myCoupon = db.coupons.find(c => c.userId === user.id && c.date === db.today && ["booked", "redeemed"].includes(c.status));

  if (!myCoupon) return (
    <>
      <SectionTitle>My coupon</SectionTitle>
      <Empty icon={QrCode} title="No coupon yet" hint="Book lunch from the Today screen." />
    </>
  );

  const cancel = () => {
    if (myCoupon.status !== "booked") { toast.show("Only booked coupons can be cancelled.", "red"); return; }
    update((cur) => {
      const coupons = cur.coupons.map(c => c.id === myCoupon.id ? { ...c, status: "cancelled" } : c);
      let next = { ...cur, coupons };
      if (cur.waitlist.length) next = notify(next, "employee", "Coupon available", "A spot opened. Open the app to book.");
      return audit(next, user.id, "Cancelled coupon", myCoupon.id);
    });
    toast.show("Cancelled. Returned to pool.", "green");
  };

  return (
    <>
      <SectionTitle>My coupon</SectionTitle>
      <Card style={{ textAlign: "center", padding: 24 }}>
        <Pill tone={myCoupon.status === "redeemed" ? "muted" : "green"}>
          {myCoupon.status === "redeemed" ? "Already redeemed" : "Active"}
        </Pill>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, margin: "12px 0 4px" }}>Slot {myCoupon.slot}</div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 18, fontFamily: "ui-monospace, monospace" }}>
          {db.today} • {myCoupon.id}
        </div>
        <div style={{ display: "inline-block", padding: 12, background: "#fff", borderRadius: 6, border: `2px solid ${T.navy}` }}>
          <QRGlyph value={myCoupon.id + myCoupon.code} size={Math.min(200, window.innerWidth - 100)} />
        </div>
        <div style={{ marginTop: 18, padding: 12, background: T.bg, borderRadius: 4, textAlign: "left", maxWidth: 320, margin: "18px auto 0", border: `1px solid ${T.rule}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>Fallback OTP</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2, letterSpacing: 4, color: T.navy }}>
                {revealOtp ? myCoupon.code : "••••"}
              </div>
            </div>
            <button onClick={() => setRevealOtp(s => !s)} style={{
              display: "flex", alignItems: "center", gap: 4, background: "#fff",
              border: `1px solid ${T.navyLine}`, borderRadius: 4, padding: "6px 10px", cursor: "pointer",
              fontSize: 11, fontWeight: 600, color: T.navy, textTransform: "uppercase",
            }}>
              {revealOtp ? <EyeOff size={12} /> : <Eye size={12} />}
              {revealOtp ? "Hide" : "Reveal"}
            </button>
          </div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 8 }}>
            Use only if QR scanner unavailable. (Biometric required in production.)
          </div>
        </div>
        {myCoupon.status === "booked" && (
          <div style={{ marginTop: 18 }}>
            <Btn onClick={cancel} variant="ghost" icon={XCircle}>Cancel coupon</Btn>
          </div>
        )}
      </Card>
    </>
  );
}

function EmployeeHistory({ db, user }) {
  const myHistory = db.coupons.filter(c => c.userId === user.id).sort((a, b) => b.id.localeCompare(a.id));
  return (
    <>
      <SectionTitle>My history</SectionTitle>
      {myHistory.length === 0 && <Empty icon={History} title="No coupons yet" />}
      {myHistory.map(c => (
        <Card key={c.id} style={{ marginBottom: 10, padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            width: 40, height: 40, background: T.navy, borderRadius: 4,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}><Receipt size={16} color="#fff" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: T.ink }}>{c.id}</div>
            <div style={{ fontSize: 11, color: T.muted }}>{c.date} • Slot {c.slot}</div>
          </div>
          <Pill tone={c.status === "redeemed" ? "green" : c.status === "booked" ? "navy" : "muted"}>{c.status}</Pill>
        </Card>
      ))}
    </>
  );
}

function EmployeeFeedback({ db, update, user, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState("");
  const [forCoupon, setForCoupon] = useState("");

  const eligible = db.coupons.filter(c => c.userId === user.id && c.status === "redeemed");

  useEffect(() => {
    if (eligible.length && !forCoupon) setForCoupon(eligible[0].id);
  }, [eligible.length, forCoupon]);

  const submit = () => {
    if (!forCoupon || !comment.trim()) { toast.show("Add a comment first.", "red"); return; }
    update((cur) => {
      const fb = { id: newId("FB"), couponId: forCoupon, userId: user.id, rating, comment, createdAt: nowIso() };
      return audit({ ...cur, feedback: [fb, ...cur.feedback] }, user.id, "Submitted feedback", `Rating ${rating}`);
    });
    toast.show("Thanks for the feedback.", "green");
    setShowForm(false); setComment(""); setRating(4);
  };

  const myFeedback = db.feedback.filter(f => f.userId === user.id);

  return (
    <>
      <SectionTitle action={<Btn small variant="accent" icon={Plus} onClick={() => setShowForm(true)}>New</Btn>}>Feedback</SectionTitle>
      {myFeedback.length === 0 && <Empty icon={MessageSquare} title="No feedback yet" hint="Rate any redeemed meal." />}
      {myFeedback.map(f => (
        <Card key={f.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: T.ink }}>{f.couponId}</div>
            <div style={{ color: T.amber, fontSize: 14 }}>{"★".repeat(f.rating)}<span style={{ color: T.rule }}>{"★".repeat(5 - f.rating)}</span></div>
          </div>
          <div style={{ fontSize: 13, color: T.body, lineHeight: 1.5 }}>{f.comment}</div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>{fmtTime(f.createdAt)}</div>
        </Card>
      ))}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Share feedback"
        footer={<>
          <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
          <Btn variant="accent" icon={Send} onClick={submit}>Submit</Btn>
        </>}>
        {eligible.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 13 }}>
            Feedback opens after you redeem a coupon.
          </div>
        ) : (
          <>
            <Field label="Coupon">
              <Sel value={forCoupon} onChange={(e) => setForCoupon(e.target.value)}>
                {eligible.map(c => <option key={c.id} value={c.id}>{c.id} • {c.date}</option>)}
              </Sel>
            </Field>
            <Field label="Rating">
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRating(n)} style={{
                    flex: 1, padding: "8px 0", borderRadius: 4, border: `1px solid ${T.navyLine}`,
                    background: rating >= n ? T.navy : "#fff",
                    color: rating >= n ? "#fff" : T.body,
                    fontSize: 16, cursor: "pointer", fontWeight: 700,
                  }}>★</button>
                ))}
              </div>
            </Field>
            <Field label="Comment">
              <TextArea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you think?" />
            </Field>
          </>
        )}
      </Modal>
    </>
  );
}

function EmployeeComplaints({ db, update, user, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("hygiene");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");

  const submit = () => {
    if (!description.trim()) { toast.show("Describe the issue first.", "red"); return; }
    const c = { id: newId("CMP"), userId: user.id, category, severity, description, evidence: evidence || "—", status: category === "hygiene" ? "escalated" : "open", createdAt: nowIso(), response: null };
    update((cur) => {
      let next = { ...cur, complaints: [c, ...cur.complaints] };
      next = notify(next, "admin", `New ${category} complaint`, `From ${user.name}: ${description.slice(0, 60)}`);
      return audit(next, user.id, "Raised complaint", c.id);
    });
    toast.show(category === "hygiene" ? "Escalated to admin." : "Complaint logged.", "green");
    setShowForm(false); setDescription(""); setEvidence("");
  };

  const my = db.complaints.filter(c => c.userId === user.id);

  return (
    <>
      <SectionTitle action={<Btn small variant="accent" icon={Plus} onClick={() => setShowForm(true)}>New</Btn>}>Complaints</SectionTitle>
      {my.length === 0 && <Empty icon={AlertTriangle} title="No complaints" hint="Hygiene issues are escalated immediately." />}
      {my.map(c => (
        <Card key={c.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, textTransform: "capitalize", color: T.ink }}>{c.category}</div>
              <div style={{ fontSize: 10, color: T.muted, fontFamily: "ui-monospace, monospace" }}>{c.id} • {fmtTime(c.createdAt)}</div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <Pill tone={c.severity === "high" ? "red" : c.severity === "medium" ? "amber" : "muted"}>{c.severity}</Pill>
              <Pill tone={c.status === "resolved" ? "green" : c.status === "escalated" ? "red" : "navy"}>{c.status}</Pill>
            </div>
          </div>
          <div style={{ fontSize: 13, color: T.body, lineHeight: 1.5 }}>{c.description}</div>
          {c.response && (
            <div style={{ marginTop: 10, padding: 10, background: T.greenSoft, borderRadius: 4, fontSize: 12, color: T.green }}>
              <strong>Response:</strong> {c.response}
            </div>
          )}
        </Card>
      ))}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Raise complaint"
        footer={<>
          <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
          <Btn variant="accent" icon={Send} onClick={submit}>Submit</Btn>
        </>}>
        <Field label="Category">
          <Sel value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="hygiene">Hygiene (urgent)</option>
            <option value="food_quality">Food quality</option>
            <option value="service">Service</option>
            <option value="other">Other</option>
          </Sel>
        </Field>
        <Field label="Severity">
          <Sel value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Sel>
        </Field>
        <Field label="Description">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened?" />
        </Field>
        <Field label="Evidence (filename or note)">
          <Input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="photo_001.jpg or a note" />
        </Field>
        {category === "hygiene" && (
          <div style={{ background: T.redSoft, color: T.red, padding: 10, borderRadius: 4, fontSize: 12 }}>
            <AlertCircle size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Hygiene complaints are escalated immediately.
          </div>
        )}
      </Modal>
    </>
  );
}

function EmployeeApp({ db, update, user, toast, isMobile }) {
  const [tab, setTab] = useState("home");
  const tabs = [
    { id: "home", label: "Today", icon: HomeIcon },
    { id: "coupon", label: "Coupon", icon: QrCode },
    { id: "history", label: "History", icon: History },
    { id: "feedback", label: "Feedback", icon: MessageSquare },
    { id: "complaints", label: "Issues", icon: AlertTriangle },
  ];
  return (
    <Shell user={user} role={ROLES[0]} tabs={tabs} active={tab} setActive={setTab}
      onLogout={() => update(c => ({ ...c, currentUser: null }))}
      onReset={() => { if (confirm("Reset all demo data?")) location.reload(); }}
      notificationsCount={db.notifications.filter(n => n.role === "employee").length}
      isMobile={isMobile}
    >
      {tab === "home" && <EmployeeHome db={db} update={update} user={user} toast={toast} setTab={setTab} />}
      {tab === "coupon" && <EmployeeCoupon db={db} update={update} user={user} toast={toast} />}
      {tab === "history" && <EmployeeHistory db={db} user={user} />}
      {tab === "feedback" && <EmployeeFeedback db={db} update={update} user={user} toast={toast} />}
      {tab === "complaints" && <EmployeeComplaints db={db} update={update} user={user} toast={toast} />}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// VENDOR
// ═══════════════════════════════════════════════════════════════════════
function VendorDashboard({ db }) {
  const issued = countStatus(db.coupons, ["booked", "redeemed"], db.today);
  const redeemed = countStatus(db.coupons, "redeemed", db.today);
  const onPool = db.vendor.todayQuantity || 0;
  const remaining = Math.max(0, onPool - issued);
  const recent = db.coupons.filter(c => c.status === "redeemed" && c.date === db.today).slice(-5).reverse();

  return (
    <>
      <SectionTitle>Today's operations</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 18 }}>
        <Stat label="Declared" value={onPool} hint={fmtTime(db.vendor.quantitySetAt)} />
        <Stat label="Issued" value={issued} hint={`${redeemed} redeemed`} tone="accent" />
        <Stat label="Remaining" value={remaining} />
        <Stat label="Staff on duty" value={db.vendorStaff.filter(s => s.onDutyToday).length} hint={`${db.vendorStaff.length} total`} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <Card>
          <SectionTitle>Live occupancy</SectionTitle>
          <OccupancyChart log={db.occupancyLog} capacity={db.config.occupancyCapacity} />
        </Card>
        <Card>
          <SectionTitle>Recent redemptions</SectionTitle>
          {recent.length === 0 ? <Empty title="None yet" /> : recent.map(c => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.rule}`, fontSize: 13 }}>
              <span style={{ color: T.ink }}>{c.name}</span>
              <span style={{ color: T.muted, fontSize: 11 }}>{fmtTime(c.redeemedAt)}</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

function VendorQuantity({ db, update, user, toast }) {
  const onPool = db.vendor.todayQuantity || 0;
  const [qty, setQty] = useState(onPool);
  const [note, setNote] = useState("");
  const setting = Number(qty) !== onPool;
  const isLate = new Date().getHours() >= 9;

  const save = () => {
    update((cur) => {
      let next = { ...cur, vendor: { ...cur.vendor, todayQuantity: Number(qty), quantitySetAt: nowIso(), quantityNote: note } };
      next = audit(next, user.id, "Updated thali quantity", `${qty} thalis${isLate ? ` (late: ${note || "no reason"})` : ""}`);
      if (isLate) next = notify(next, "admin", "Late thali update", `${qty} thalis @ ${fmtTime(nowIso())}. Reason: ${note || "—"}`);
      return next;
    });
    toast.show("Quantity saved.", "green");
    setNote("");
  };

  return (
    <>
      <SectionTitle>Daily thali declaration</SectionTitle>
      <Card accent>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <Pill tone="green">Last set {fmtTime(db.vendor.quantitySetAt)}</Pill>
          <Pill tone="amber">Deadline {db.config.vendorQuantityDeadline}</Pill>
        </div>
        <Field label="Today's thali count">
          <div style={{ display: "flex", alignItems: "stretch", border: `1px solid ${T.navyLine}`, borderRadius: 4, overflow: "hidden", maxWidth: 260 }}>
            <button onClick={() => setQty(q => Math.max(0, Number(q) - 5))} style={{ background: T.bg, border: "none", padding: "0 14px", cursor: "pointer", color: T.navy }}><Minus size={14} /></button>
            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} style={{
              flex: 1, border: "none", textAlign: "center", fontSize: 24, padding: 12, outline: "none",
              fontWeight: 700, color: T.navy, minWidth: 0,
            }} />
            <button onClick={() => setQty(q => Number(q) + 5)} style={{ background: T.bg, border: "none", padding: "0 14px", cursor: "pointer", color: T.navy }}><Plus size={14} /></button>
          </div>
        </Field>
        {setting && isLate && (
          <Field label="Reason for late update (mandatory)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., supply delay" />
          </Field>
        )}
        <Btn onClick={save} variant="accent" icon={Check} disabled={!setting || (isLate && !note.trim())}>
          Save quantity
        </Btn>
      </Card>
    </>
  );
}

function VendorScan({ db, update, user, toast }) {
  const [code, setCode] = useState("");
  const [last, setLast] = useState(null);

  const tryRedeem = (input) => {
    const inp = (input || "").trim().toUpperCase();
    if (!inp) return;
    const found = db.coupons.find(c => c.date === db.today && (c.id === inp || c.code === inp));
    if (!found) { setLast({ ok: false, reason: "Coupon not found for today" }); toast.show("Not found", "red"); return; }
    if (found.status === "redeemed") { setLast({ ok: false, reason: `Already redeemed at ${fmtTime(found.redeemedAt)}`, coupon: found }); toast.show("Already redeemed", "red"); return; }
    if (found.status === "cancelled") { setLast({ ok: false, reason: "Coupon was cancelled", coupon: found }); toast.show("Cancelled coupon", "red"); return; }

    update((cur) => {
      const coupons = cur.coupons.map(c => c.id === found.id ? { ...c, status: "redeemed", redeemedAt: nowIso() } : c);
      return audit({ ...cur, coupons }, user.id, "Redeemed coupon", found.id);
    });
    setLast({ ok: true, coupon: { ...found, status: "redeemed" } });
    toast.show(`Redeemed: ${found.name}`, "green");
    setCode("");
  };

  return (
    <>
      <SectionTitle>Scan & redeem</SectionTitle>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 10px", marginBottom: 14, background: T.bg, borderRadius: 4 }}>
          <div style={{
            width: 160, height: 160, border: `3px dashed ${T.navy}`, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, background: "#fff",
          }}>
            <Camera size={36} color={T.navy} style={{ opacity: 0.5 }} />
          </div>
          <div style={{ fontSize: 12, color: T.muted, textAlign: "center" }}>Camera scanner appears here on device. Use fallback below.</div>
        </div>
        <Field label="Coupon ID or OTP code">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CPN-1043 or 3FP9"
              style={{ flex: "1 1 200px", fontFamily: "ui-monospace, monospace", textTransform: "uppercase" }}
              onKeyDown={(e) => e.key === "Enter" && tryRedeem(code)} />
            <Btn onClick={() => tryRedeem(code)} variant="accent" icon={Check}>Redeem</Btn>
          </div>
        </Field>
        <div style={{ marginTop: 8, fontSize: 11, color: T.muted }}>
          Try active coupon: <code style={{ background: T.navySoft, padding: "2px 6px", borderRadius: 3, color: T.navy }}>CPN-1043</code> or code <code style={{ background: T.navySoft, padding: "2px 6px", borderRadius: 3, color: T.navy }}>1ZX4</code>
        </div>

        {last && (
          <div style={{
            marginTop: 16, padding: 14, borderRadius: 4,
            background: last.ok ? T.greenSoft : T.redSoft,
            color: last.ok ? T.green : T.red,
            border: `1px solid ${last.ok ? T.green : T.red}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, textTransform: "uppercase", fontSize: 13, letterSpacing: 0.4 }}>
              {last.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {last.ok ? "Redeemed" : last.reason}
            </div>
            {last.coupon && (
              <div style={{ marginTop: 8, fontSize: 13, color: T.ink, lineHeight: 1.6 }}>
                <strong>{last.coupon.name}</strong> — {last.coupon.id}<br />
                {last.coupon.type === "visitor" ? `Visitor (${last.coupon.company})` : `Employee`} • Slot {last.coupon.slot}
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  );
}

function VendorStaff({ db, update, user, toast }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Server", govId: "", phone: "" });

  const addStaff = () => {
    if (!form.name || !form.govId) { toast.show("Name & ID required", "red"); return; }
    const s = { id: newId("VST"), ...form, status: "pending", onDutyToday: false, entryAt: null, exitAt: null };
    update((cur) => {
      let next = { ...cur, vendorStaff: [...cur.vendorStaff, s] };
      next = audit(next, user.id, "Registered vendor staff", s.id);
      return notify(next, "admin", "Staff approval needed", `${s.name} (${s.role})`);
    });
    toast.show("Sent for approval", "green");
    setShowAdd(false);
    setForm({ name: "", role: "Server", govId: "", phone: "" });
  };

  const toggleDuty = (id) => update((cur) => {
    const vendorStaff = cur.vendorStaff.map(s => s.id === id ? { ...s, onDutyToday: !s.onDutyToday, entryAt: !s.onDutyToday ? nowIso() : s.entryAt } : s);
    return audit({ ...cur, vendorStaff }, user.id, "Toggled staff duty", id);
  });

  const markExit = (id) => update((cur) => {
    const vendorStaff = cur.vendorStaff.map(s => s.id === id ? { ...s, exitAt: nowIso(), onDutyToday: false } : s);
    return audit({ ...cur, vendorStaff }, user.id, "Staff exit", id);
  });

  return (
    <>
      <SectionTitle action={<Btn small variant="accent" icon={UserPlus} onClick={() => setShowAdd(true)}>Register</Btn>}>Vendor staff</SectionTitle>
      {db.vendorStaff.map(s => (
        <Card key={s.id} style={{ marginBottom: 10, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{s.name}</div>
              <div style={{ fontSize: 12, color: T.body, marginTop: 2 }}>{s.role} • {s.id}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4, fontFamily: "ui-monospace, monospace" }}>{s.govId}</div>
              {s.entryAt && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>In {fmtTime(s.entryAt)} {s.exitAt && `• Out ${fmtTime(s.exitAt)}`}</div>}
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <Pill tone={s.status === "approved" ? "green" : "amber"}>{s.status}</Pill>
              {s.status === "approved" && <Pill tone={s.onDutyToday ? "navy" : "muted"}>{s.onDutyToday ? "On duty" : "Off"}</Pill>}
            </div>
          </div>
          {s.status === "approved" && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {!s.onDutyToday && !s.exitAt && <Btn small variant="ghost" onClick={() => toggleDuty(s.id)} icon={Unlock}>Mark entry</Btn>}
              {s.onDutyToday && <Btn small variant="ghost" onClick={() => markExit(s.id)} icon={Lock}>Mark exit</Btn>}
            </div>
          )}
        </Card>
      ))}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Register staff"
        footer={<>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
          <Btn variant="accent" icon={Send} onClick={addStaff}>Submit</Btn>
        </>}>
        <Field label="Full name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Role"><Sel value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
          <option>Server</option><option>Cook</option><option>Cleaner</option><option>Helper</option>
        </Sel></Field>
        <Field label="Government ID (masked)"><Input value={form.govId} onChange={e => setForm({ ...form, govId: e.target.value })} placeholder="XXXX-XXXX-NNNN" /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="98xxx-xxxxx" /></Field>
        <div style={{ background: T.amberSoft, color: T.amber, padding: 10, borderRadius: 4, fontSize: 12 }}>
          Photo & gov-ID upload happens on device. Admin must approve before duty.
        </div>
      </Modal>
    </>
  );
}

function VendorComplaints({ db, update, user, toast }) {
  const [resp, setResp] = useState({});
  const respond = (id) => {
    const text = resp[id]?.trim();
    if (!text) return;
    update((cur) => {
      const complaints = cur.complaints.map(c => c.id === id ? { ...c, response: text, status: "in_progress" } : c);
      return audit({ ...cur, complaints }, user.id, "Responded to complaint", id);
    });
    toast.show("Response sent.", "green");
    setResp(r => ({ ...r, [id]: "" }));
  };

  const list = db.complaints;
  return (
    <>
      <SectionTitle>Complaints</SectionTitle>
      {list.length === 0 && <Empty icon={AlertTriangle} title="No complaints" />}
      {list.map(c => (
        <Card key={c.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
            <div style={{ fontWeight: 600, textTransform: "capitalize", color: T.ink }}>{c.category}</div>
            <div style={{ display: "flex", gap: 5 }}>
              <Pill tone={c.severity === "high" ? "red" : "amber"}>{c.severity}</Pill>
              <Pill tone={c.status === "resolved" ? "green" : "navy"}>{c.status}</Pill>
            </div>
          </div>
          <div style={{ fontSize: 13, color: T.body, lineHeight: 1.5 }}>{c.description}</div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>From {c.userId} • {fmtTime(c.createdAt)}</div>
          {c.response && <div style={{ marginTop: 10, padding: 10, background: T.greenSoft, borderRadius: 4, fontSize: 12, color: T.green }}><strong>Your response:</strong> {c.response}</div>}
          {c.status !== "resolved" && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <Input value={resp[c.id] || ""} onChange={e => setResp(r => ({ ...r, [c.id]: e.target.value }))} placeholder="Reply…" style={{ flex: "1 1 200px" }} />
              <Btn small icon={Send} onClick={() => respond(c.id)}>Reply</Btn>
            </div>
          )}
        </Card>
      ))}
    </>
  );
}

function VendorApp({ db, update, user, toast, isMobile }) {
  const [tab, setTab] = useState("dashboard");
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "quantity", label: "Quantity", icon: Utensils },
    { id: "scan", label: "Scan", icon: QrCode },
    { id: "staff", label: "Staff", icon: Users },
    { id: "complaints", label: "Issues", icon: AlertTriangle },
  ];
  return (
    <Shell user={user} role={ROLES[1]} tabs={tabs} active={tab} setActive={setTab}
      onLogout={() => update(c => ({ ...c, currentUser: null }))}
      onReset={() => { if (confirm("Reset all demo data?")) location.reload(); }}
      isMobile={isMobile}
    >
      {tab === "dashboard" && <VendorDashboard db={db} />}
      {tab === "quantity" && <VendorQuantity db={db} update={update} user={user} toast={toast} />}
      {tab === "scan" && <VendorScan db={db} update={update} user={user} toast={toast} />}
      {tab === "staff" && <VendorStaff db={db} update={update} user={user} toast={toast} />}
      {tab === "complaints" && <VendorComplaints db={db} update={update} user={user} toast={toast} />}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════
function AdminDashboard({ db }) {
  const issued = countStatus(db.coupons, ["booked", "redeemed"], db.today);
  const redeemed = countStatus(db.coupons, "redeemed", db.today);
  const visitors = db.coupons.filter(c => c.type === "visitor" && c.date === db.today).length;
  const onPool = db.vendor.todayQuantity || 0;

  return (
    <>
      <SectionTitle>Operations overview</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 18 }}>
        <Stat label="Pool today" value={onPool} hint="From vendor" />
        <Stat label="Issued" value={issued} hint={`${redeemed} redeemed`} tone="accent" />
        <Stat label="Visitors" value={visitors} hint="Sponsored" />
        <Stat label="Open complaints" value={db.complaints.filter(c => c.status !== "resolved").length} hint={`${db.complaints.filter(c => c.severity === "high").length} high`} />
        <Stat label="Refunds pending" value={db.refunds.filter(r => r.status !== "approved").length} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <Card>
          <SectionTitle>Live occupancy</SectionTitle>
          <OccupancyChart log={db.occupancyLog} capacity={db.config.occupancyCapacity} />
        </Card>
        <Card>
          <SectionTitle>AI signals</SectionTitle>
          <AISignals db={db} />
        </Card>
      </div>
      <div style={{ marginTop: 18 }}>
        <SectionTitle>Today's coupons</SectionTitle>
        <CouponTable coupons={db.coupons.filter(c => c.date === db.today)} />
      </div>
    </>
  );
}

function AdminVisitors({ db, update, user, toast }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", company: "", purpose: "", host: "" });

  const onPool = db.vendor.todayQuantity || 0;
  const issued = countStatus(db.coupons, ["booked", "redeemed"], db.today);

  const sponsor = () => {
    if (!form.name || !form.phone) { toast.show("Name & phone required", "red"); return; }
    if (issued >= onPool) { toast.show("No coupons left in pool.", "red"); return; }
    const c = {
      id: newId("CPN"), type: "visitor", userId: newId("VIS"), name: form.name, company: form.company,
      host: form.host, slot: "13:00", status: "booked", date: db.today, code: rand(4),
      sponsoredBy: user.id, phone: form.phone, purpose: form.purpose,
    };
    update((cur) => {
      let next = { ...cur, coupons: [...cur.coupons, c] };
      next = notify(next, "visitor", "Lunch coupon ready", `${form.name}: tap the SMS link to view.`);
      return audit(next, user.id, "Sponsored visitor coupon", `${form.name} (${form.company})`);
    });
    toast.show("Visitor SMS sent (simulated).", "green");
    setShowAdd(false);
    setForm({ name: "", phone: "", company: "", purpose: "", host: "" });
  };

  const cancelVisitor = (id) => update((cur) => {
    const coupons = cur.coupons.map(c => c.id === id ? { ...c, status: "cancelled" } : c);
    return audit({ ...cur, coupons }, user.id, "Cancelled visitor coupon", id);
  });

  const visitorCoupons = db.coupons.filter(c => c.type === "visitor").reverse();

  return (
    <>
      <SectionTitle action={<Btn small variant="accent" icon={Plus} onClick={() => setShowAdd(true)}>Sponsor</Btn>}>Visitor sponsorship</SectionTitle>
      {visitorCoupons.length === 0 && <Empty icon={UserPlus} title="No visitor coupons" />}
      {visitorCoupons.map(c => (
        <Card key={c.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div style={{ flex: "1 1 200px" }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{c.name} <span style={{ color: T.muted, fontWeight: 400 }}>· {c.company}</span></div>
              <div style={{ fontSize: 12, color: T.body, marginTop: 4 }}>{c.id} • Host {c.host || "—"} • {c.date}</div>
              {c.phone && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}><Phone size={11} style={{ verticalAlign: "middle" }} /> {c.phone}</div>}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <Pill tone={c.status === "redeemed" ? "green" : c.status === "booked" ? "navy" : "muted"}>{c.status}</Pill>
              {c.status === "booked" && <Btn small variant="ghost" icon={XCircle} onClick={() => cancelVisitor(c.id)}>Cancel</Btn>}
            </div>
          </div>
        </Card>
      ))}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Sponsor visitor coupon" wide
        footer={<>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
          <Btn variant="accent" icon={Send} onClick={sponsor}>Send SMS QR</Btn>
        </>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <Field label="Visitor name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Mobile (SMS)"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 …" /></Field>
          <Field label="Company"><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></Field>
          <Field label="Host employee"><Input value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="EMP-…" /></Field>
        </div>
        <Field label="Purpose of visit"><Input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} /></Field>
        <div style={{ background: T.navySoft, padding: 10, borderRadius: 4, fontSize: 12, color: T.navy }}>
          One coupon will deduct from today's pool ({Math.max(0, onPool - issued)} remaining). Visitor receives an SMS with same-day QR.
        </div>
      </Modal>
    </>
  );
}

function AdminCoupons({ db, update, user, toast }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  let filtered = db.coupons.filter(c => c.date === db.today);
  if (filter !== "all") filtered = filtered.filter(c => c.status === filter);
  if (q) filtered = filtered.filter(c => (c.name + c.id + (c.company || "")).toLowerCase().includes(q.toLowerCase()));

  const overrideCancel = (id) => {
    if (!confirm("Override cancel this coupon?")) return;
    update((cur) => {
      const coupons = cur.coupons.map(c => c.id === id ? { ...c, status: "cancelled" } : c);
      return audit({ ...cur, coupons }, user.id, "Admin override cancelled coupon", id);
    });
    toast.show("Cancelled.", "green");
  };

  return (
    <>
      <SectionTitle>All coupons today</SectionTitle>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <Input placeholder="Search name / ID" value={q} onChange={e => setQ(e.target.value)} style={{ flex: "1 1 180px" }} />
        <Sel value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 160 }}>
          <option value="all">All statuses</option>
          <option value="booked">Booked</option>
          <option value="redeemed">Redeemed</option>
          <option value="cancelled">Cancelled</option>
        </Sel>
      </div>
      <CouponTable coupons={filtered} onCancel={overrideCancel} />
    </>
  );
}

function AdminRefunds({ db, update, user, toast }) {
  const cancelledNoRefund = db.coupons.filter(c => c.status === "cancelled" && !db.refunds.find(r => r.couponId === c.id));

  const fileRefund = (c) => {
    const r = { id: newId("RF"), couponId: c.id, userId: c.userId, name: c.name, amount: 0, status: "pending", filedBy: user.id, filedAt: nowIso() };
    update((cur) => audit({ ...cur, refunds: [r, ...cur.refunds] }, user.id, "Filed refund request", c.id));
    toast.show("Refund queued.", "green");
  };
  const verify = (id) => update((cur) => {
    const refunds = cur.refunds.map(r => r.id === id ? { ...r, status: "verified" } : r);
    return audit({ ...cur, refunds }, user.id, "Verified refund", id);
  });
  const approve = (id) => update((cur) => {
    const refunds = cur.refunds.map(r => r.id === id ? { ...r, status: "approved", approvedAt: nowIso() } : r);
    return audit({ ...cur, refunds }, user.id, "Approved refund", id);
  });

  return (
    <>
      <SectionTitle>Refund queue</SectionTitle>
      {db.refunds.length === 0 && <Empty icon={RefreshCw} title="No refunds in flight" />}
      {db.refunds.map(r => (
        <Card key={r.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 600, color: T.ink }}>{r.name}</div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: "ui-monospace, monospace" }}>{r.id} • Coupon {r.couponId}</div>
            </div>
            <Pill tone={r.status === "approved" ? "green" : r.status === "verified" ? "amber" : "navy"}>{r.status}</Pill>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {r.status === "pending" && <Btn small variant="ghost" onClick={() => verify(r.id)} icon={Check}>Verify (vendor)</Btn>}
            {r.status === "verified" && <Btn small variant="accent" onClick={() => approve(r.id)} icon={Check}>Approve</Btn>}
          </div>
        </Card>
      ))}
      {cancelledNoRefund.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <SectionTitle>Eligible cancellations</SectionTitle>
          {cancelledNoRefund.map(c => (
            <Card key={c.id} style={{ marginBottom: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 600, color: T.ink }}>{c.name}</div>
                <div style={{ fontSize: 11, color: T.muted, fontFamily: "ui-monospace, monospace" }}>{c.id} • {c.date}</div>
              </div>
              <Btn small variant="ghost" icon={Plus} onClick={() => fileRefund(c)}>File refund</Btn>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function AdminComplaints({ db, update, user, toast }) {
  const resolve = (id) => update((cur) => {
    const complaints = cur.complaints.map(c => c.id === id ? { ...c, status: "resolved" } : c);
    let next = audit({ ...cur, complaints }, user.id, "Resolved complaint", id);
    const c = complaints.find(c => c.id === id);
    next = notify(next, "employee", "Complaint resolved", c.description.slice(0, 60));
    return next;
  });

  return (
    <>
      <SectionTitle>Complaints inbox</SectionTitle>
      {db.complaints.length === 0 && <Empty icon={AlertTriangle} title="No complaints" />}
      {db.complaints.map(c => (
        <Card key={c.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600, textTransform: "capitalize", color: T.ink }}>{c.category}</div>
              <div style={{ fontSize: 10, color: T.muted, fontFamily: "ui-monospace, monospace" }}>{c.id} • {c.userId} • {fmtTime(c.createdAt)}</div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <Pill tone={c.severity === "high" ? "red" : c.severity === "medium" ? "amber" : "muted"}>{c.severity}</Pill>
              <Pill tone={c.status === "resolved" ? "green" : c.status === "escalated" ? "red" : "navy"}>{c.status}</Pill>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: T.body, lineHeight: 1.5 }}>{c.description}</div>
          {c.evidence && <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>Evidence: {c.evidence}</div>}
          {c.response && <div style={{ marginTop: 10, padding: 10, background: T.greenSoft, borderRadius: 4, fontSize: 12, color: T.green }}><strong>Vendor:</strong> {c.response}</div>}
          {c.status !== "resolved" && (
            <div style={{ marginTop: 10 }}>
              <Btn small variant="accent" onClick={() => resolve(c.id)} icon={Check}>Resolve</Btn>
            </div>
          )}
        </Card>
      ))}
    </>
  );
}

function AdminStaff({ db, update, user, toast }) {
  const approve = (id) => update((cur) => {
    const vendorStaff = cur.vendorStaff.map(s => s.id === id ? { ...s, status: "approved" } : s);
    return audit({ ...cur, vendorStaff }, user.id, "Approved vendor staff", id);
  });
  const reject = (id) => update((cur) => {
    const vendorStaff = cur.vendorStaff.map(s => s.id === id ? { ...s, status: "rejected" } : s);
    return audit({ ...cur, vendorStaff }, user.id, "Rejected vendor staff", id);
  });
  return (
    <>
      <SectionTitle>Vendor staff oversight</SectionTitle>
      {db.vendorStaff.map(s => (
        <Card key={s.id} style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 600, color: T.ink }}>{s.name}</div>
            <div style={{ fontSize: 11, color: T.body, fontFamily: "ui-monospace, monospace" }}>{s.role} • {s.id} • {s.govId}</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <Pill tone={s.status === "approved" ? "green" : s.status === "rejected" ? "red" : "amber"}>{s.status}</Pill>
            {s.status === "pending" && <>
              <Btn small variant="ghost" icon={Check} onClick={() => approve(s.id)}>Approve</Btn>
              <Btn small variant="ghost" icon={X} onClick={() => reject(s.id)}>Reject</Btn>
            </>}
          </div>
        </Card>
      ))}
    </>
  );
}

function AdminAudit({ db }) {
  return (
    <>
      <SectionTitle>Audit log</SectionTitle>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {db.audit.map((a, i) => (
          <div key={a.id} style={{
            padding: "10px 14px", borderBottom: i < db.audit.length - 1 ? `1px solid ${T.rule}` : "none",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap",
            background: i % 2 ? "#fafbfd" : "#fff",
          }}>
            <div style={{ flex: "1 1 200px" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{a.action}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{a.detail}</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: T.muted }}>
              <div style={{ fontFamily: "ui-monospace, monospace", color: T.navy }}>{a.actor}</div>
              <div>{fmtTime(a.at)}</div>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}

function AdminApp({ db, update, user, toast, isMobile }) {
  const [tab, setTab] = useState("dashboard");
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "visitors", label: "Visitors", icon: UserPlus },
    { id: "coupons", label: "Coupons", icon: Receipt },
    { id: "refunds", label: "Refunds", icon: RefreshCw },
    { id: "complaints", label: "Issues", icon: AlertTriangle },
    { id: "staff", label: "Staff", icon: Users },
    { id: "audit", label: "Audit", icon: History },
  ];
  return (
    <Shell user={user} role={ROLES[2]} tabs={tabs} active={tab} setActive={setTab}
      onLogout={() => update(c => ({ ...c, currentUser: null }))}
      onReset={() => { if (confirm("Reset all demo data?")) location.reload(); }}
      notificationsCount={db.notifications.filter(n => n.role === "admin").length}
      isMobile={isMobile}
    >
      {tab === "dashboard" && <AdminDashboard db={db} />}
      {tab === "visitors" && <AdminVisitors db={db} update={update} user={user} toast={toast} />}
      {tab === "coupons" && <AdminCoupons db={db} update={update} user={user} toast={toast} />}
      {tab === "refunds" && <AdminRefunds db={db} update={update} user={user} toast={toast} />}
      {tab === "complaints" && <AdminComplaints db={db} update={update} user={user} toast={toast} />}
      {tab === "staff" && <AdminStaff db={db} update={update} user={user} toast={toast} />}
      {tab === "audit" && <AdminAudit db={db} />}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SUPER ADMIN
// ═══════════════════════════════════════════════════════════════════════
function SuperConfig({ db, update, user, toast }) {
  const [draft, setDraft] = useState(db.config);
  const save = () => {
    update((cur) => audit({
      ...cur,
      config: {
        ...draft,
        occupancyCapacity: Number(draft.occupancyCapacity),
        bookingOpenHour: Number(draft.bookingOpenHour),
        cancellationCutoffMinutes: Number(draft.cancellationCutoffMinutes),
        feedbackWindowHours: Number(draft.feedbackWindowHours),
      },
    }, user.id, "Updated system configuration", JSON.stringify(draft)));
    toast.show("Configuration saved.", "green");
  };

  return (
    <>
      <SectionTitle>System rules</SectionTitle>
      <Card accent>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <Field label="Booking open hour"><Input type="number" value={draft.bookingOpenHour} onChange={e => setDraft({ ...draft, bookingOpenHour: e.target.value })} /></Field>
          <Field label="Vendor deadline"><Input value={draft.vendorQuantityDeadline} onChange={e => setDraft({ ...draft, vendorQuantityDeadline: e.target.value })} /></Field>
          <Field label="Cancellation cutoff (min)"><Input type="number" value={draft.cancellationCutoffMinutes} onChange={e => setDraft({ ...draft, cancellationCutoffMinutes: e.target.value })} /></Field>
          <Field label="Feedback window (hours)"><Input type="number" value={draft.feedbackWindowHours} onChange={e => setDraft({ ...draft, feedbackWindowHours: e.target.value })} /></Field>
          <Field label="Occupancy capacity"><Input type="number" value={draft.occupancyCapacity} onChange={e => setDraft({ ...draft, occupancyCapacity: e.target.value })} /></Field>
        </div>
        <Btn variant="accent" icon={Check} onClick={save}>Save configuration</Btn>
      </Card>
    </>
  );
}

function SuperReports({ db }) {
  const total = db.coupons.length;
  const redeemed = db.coupons.filter(c => c.status === "redeemed").length;
  const cancelled = db.coupons.filter(c => c.status === "cancelled").length;
  const visitors = db.coupons.filter(c => c.type === "visitor").length;
  const avgRating = db.feedback.length ? (db.feedback.reduce((a, f) => a + f.rating, 0) / db.feedback.length).toFixed(1) : "—";

  const exportJson = () => {
    try {
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `canteen-${db.today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  return (
    <>
      <SectionTitle action={<Btn small variant="ghost" icon={Download} onClick={exportJson}>Export JSON</Btn>}>Reports</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <Stat label="Lifetime coupons" value={total} />
        <Stat label="Redeemed" value={redeemed} tone="accent" />
        <Stat label="Cancelled" value={cancelled} />
        <Stat label="Visitor share" value={`${total ? Math.round((visitors / total) * 100) : 0}%`} />
        <Stat label="Avg feedback" value={avgRating} hint={`${db.feedback.length} reviews`} />
      </div>
    </>
  );
}

function SuperAdminApp({ db, update, user, toast, isMobile }) {
  const [tab, setTab] = useState("config");
  const tabs = [
    { id: "config", label: "Config", icon: Settings },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "audit", label: "Audit", icon: History },
  ];
  return (
    <Shell user={user} role={ROLES[3]} tabs={tabs} active={tab} setActive={setTab}
      onLogout={() => update(c => ({ ...c, currentUser: null }))}
      onReset={() => { if (confirm("Reset all demo data?")) location.reload(); }}
      isMobile={isMobile}
    >
      {tab === "config" && <SuperConfig db={db} update={update} user={user} toast={toast} />}
      {tab === "reports" && <SuperReports db={db} />}
      {tab === "audit" && <AdminAudit db={db} />}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// VISITOR
// ═══════════════════════════════════════════════════════════════════════
function VisitorApp({ db, update, user }) {
  const coupon = useMemo(
    () => [...db.coupons].reverse().find(c => c.type === "visitor" && (c.name === user.name || c.userId === user.id)),
    [db.coupons, user]
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.sans, padding: 16, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: T.navy, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Utensils size={14} color="#fff" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, letterSpacing: 0.5 }}>AMNEX CANTEEN</div>
        </div>
        <button onClick={() => update(c => ({ ...c, currentUser: null }))} style={{ background: "none", border: `1px solid ${T.navyLine}`, padding: 6, borderRadius: 4, cursor: "pointer", color: T.navy, display: "flex" }}>
          <LogOut size={14} />
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {!coupon ? (
            <Card style={{ textAlign: "center", padding: 28 }}>
              <UserPlus size={36} color={T.navy} style={{ opacity: 0.5 }} />
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12, color: T.navy }}>No coupon yet</div>
              <div style={{ color: T.body, fontSize: 13, marginTop: 8 }}>Ask your host to sponsor a lunch coupon. You'll receive an SMS link.</div>
            </Card>
          ) : (
            <Card accent style={{ textAlign: "center", padding: 24 }}>
              <Pill tone={coupon.status === "redeemed" ? "muted" : "green"}>{coupon.status === "redeemed" ? "Already redeemed" : "Valid for today"}</Pill>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.navy, marginTop: 14, marginBottom: 4 }}>Hello, {coupon.name.split(" ")[0]}</div>
              <div style={{ fontSize: 12, color: T.body, marginBottom: 18 }}>Lunch is on us at {coupon.company || "your host's organization"}.</div>
              <div style={{ display: "inline-block", padding: 12, background: "#fff", borderRadius: 6, border: `2px solid ${T.navy}` }}>
                <QRGlyph value={coupon.id + coupon.code} size={Math.min(200, window.innerWidth - 100)} />
              </div>
              <div style={{ marginTop: 14, fontSize: 11, color: T.muted, fontFamily: "ui-monospace, monospace" }}>{coupon.id} • Code {coupon.code}</div>
              <div style={{ marginTop: 14, padding: 10, background: T.bg, borderRadius: 4, fontSize: 11, color: T.body, lineHeight: 1.5, border: `1px solid ${T.rule}` }}>
                Show this QR at the canteen counter. If the scanner is unavailable, give the code instead.
              </div>
            </Card>
          )}
        </div>
      </div>
      <div style={{ textAlign: "center", color: T.muted, fontSize: 10, marginTop: 18, textTransform: "uppercase", letterSpacing: 0.6 }}>
        AMNEX · Canteen Operations
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP — uses React state only, NO blocking storage on every keystroke
// ═══════════════════════════════════════════════════════════════════════
function useResponsive() {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 880 : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 880);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
}

function useToast() {
  const [t, setT] = useState(null);
  const timerRef = useRef(null);
  const show = useCallback((msg, tone = "ink") => {
    setT({ msg, tone, key: Date.now() });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setT(null), 2600);
  }, []);
  const node = t ? (
    <div key={t.key} style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: t.tone === "red" ? T.red : t.tone === "green" ? T.green : t.tone === "amber" ? T.amber : T.navy,
      color: "#fff", padding: "10px 16px", borderRadius: 4, fontSize: 13, fontWeight: 600,
      zIndex: 200, boxShadow: "0 8px 22px rgba(15,24,56,0.3)", fontFamily: T.sans,
      maxWidth: "92vw", textAlign: "center", letterSpacing: 0.3,
    }}>{t.msg}</div>
  ) : null;
  return { show, node };
}

export default function App() {
  // Plain useState DB. Storage is debounced and never blocks render.
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useResponsive();
  const toast = useToast();
  const writeTimer = useRef(null);
  const latestDb = useRef(null);

  // Load once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded = null;
      try {
        const r = await window.storage.get(DB_KEY);
        if (r && r.value) loaded = JSON.parse(r.value);
      } catch { }
      if (cancelled) return;
      const initial = loaded || seedDB();
      setDb(initial);
      latestDb.current = initial;
      setLoading(false);
      if (!loaded) {
        try { await window.storage.set(DB_KEY, JSON.stringify(initial)); } catch { }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Debounced write whenever db changes
  useEffect(() => {
    if (!db) return;
    latestDb.current = db;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      try { window.storage.set(DB_KEY, JSON.stringify(latestDb.current)).catch(() => { }); } catch { }
    }, 350);
  }, [db]);

  const update = useCallback((mut) => {
    setDb(cur => mut(cur));
  }, []);

  const pickRole = useCallback((r) => {
    setDb(cur => ({ ...cur, currentUser: { role: r.id, ...r.user } }));
  }, []);

  if (loading || !db) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.sans, color: T.muted, flexDirection: "column", gap: 10 }}>
        <Utensils size={28} color={T.navy} />
        <div style={{ fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase" }}>Loading…</div>
      </div>
    );
  }

  const cur = db.currentUser;
  if (!cur) return (<><RoleLanding onPick={pickRole} />{toast.node}</>);

  return (
    <>
      {cur.role === "employee" && <EmployeeApp db={db} update={update} user={cur} toast={toast} isMobile={isMobile} />}
      {cur.role === "vendor" && <VendorApp db={db} update={update} user={cur} toast={toast} isMobile={isMobile} />}
      {cur.role === "admin" && <AdminApp db={db} update={update} user={cur} toast={toast} isMobile={isMobile} />}
      {cur.role === "superadmin" && <SuperAdminApp db={db} update={update} user={cur} toast={toast} isMobile={isMobile} />}
      {cur.role === "visitor" && <VisitorApp db={db} update={update} user={cur} />}
      {toast.node}
    </>
  );
}
