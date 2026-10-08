"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:4000/api/v1";

interface Vendor {
  id: string;
  vendorCode: string;
  businessName: string;
  contactEmail: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  createdAt: string;
  user?: { name?: string; email?: string };
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
  SUSPENDED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  APPROVED: CheckCircle2,
  PENDING: Clock,
  REJECTED: XCircle,
  SUSPENDED: XCircle,
};

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch(`${API_BASE}/vendors`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const inner = data?.data ?? data;
        setVendors(Array.isArray(inner) ? inner : []);
      })
      .catch(() => toast.error("Failed to load vendors"))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = vendors.filter((v) => {
    const q = search.toLowerCase();
    return (
      !q ||
      v.vendorCode.toLowerCase().includes(q) ||
      v.businessName.toLowerCase().includes(q) ||
      v.contactEmail.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amnex-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[var(--ink-primary)]">Vendors</h1>
            <p className="text-sm text-[var(--ink-muted)]">{vendors.length} total vendors</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--ink-primary)] text-sm focus:outline-none focus:border-amnex-blue/50"
          />
        </div>

        {/* Table */}
        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["Code", "Business", "Email", "Status", "Joined", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => {
                const StatusIcon = STATUS_ICONS[v.status] || Clock;
                return (
                  <motion.tr
                    key={v.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm font-bold text-[var(--ink-primary)]">{v.vendorCode}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
                        <span className="text-sm text-[var(--ink-primary)]">{v.businessName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-[var(--ink-muted)]">{v.contactEmail}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider",
                        STATUS_STYLES[v.status] || STATUS_STYLES.PENDING
                      )}>
                        <StatusIcon className="w-3 h-3" />
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-[var(--ink-muted)]">
                        {new Date(v.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/superadmin/vendors/${v.id}`}
                        className="text-[10px] font-black uppercase tracking-widest text-amnex-blue hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--ink-muted)] text-sm">
                    No vendors found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
