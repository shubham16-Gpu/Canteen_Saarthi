"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  User,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:4000/api/v1";

interface Vendor {
  id: string;
  vendorCode: string;
  businessName: string;
  contactEmail: string;
  contactPhone?: string;
  gstNumber?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
}

export default function VendorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch(`${API_BASE}/vendors/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setVendor(data?.data || data))
      .catch(() => toast.error("Failed to load vendor"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const updateStatus = async (status: string) => {
    const token = localStorage.getItem("auth_token");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/vendors/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setVendor((v) => v ? { ...v, status: status as Vendor["status"] } : v);
        toast.success(`Vendor ${status.toLowerCase()}`);
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amnex-blue" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--ink-muted)]">Vendor not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] p-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back */}
        <Link
          href="/superadmin/vendors"
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)] hover:text-amnex-blue transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Vendors
        </Link>

        {/* Header */}
        <div className="glass rounded-2xl p-6 border border-white/5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amnex-blue/10 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-amnex-blue" />
              </div>
              <div>
                <h1 className="text-xl font-black text-[var(--ink-primary)]">{vendor.businessName}</h1>
                <p className="text-sm text-[var(--ink-muted)] font-mono">{vendor.vendorCode}</p>
              </div>
            </div>
            <span className={cn(
              "px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest",
              vendor.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
              vendor.status === "PENDING" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              "bg-red-500/10 text-red-400 border-red-500/20"
            )}>
              {vendor.status}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)]">Details</h2>
          {[
            { icon: Mail, label: "Email", value: vendor.contactEmail },
            { icon: Phone, label: "Phone", value: vendor.contactPhone || "–" },
            { icon: User, label: "Contact", value: vendor.user?.name || "–" },
            { icon: Clock, label: "Joined", value: new Date(vendor.createdAt).toLocaleDateString("en-IN") },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-[var(--ink-muted)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)] w-20">{label}</span>
              <span className="text-sm text-[var(--ink-primary)]">{value}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        {vendor.status !== "APPROVED" && (
          <div className="flex gap-3">
            <button
              onClick={() => updateStatus("APPROVED")}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve
            </button>
          </div>
        )}
        {vendor.status === "PENDING" && (
          <button
            onClick={() => updateStatus("REJECTED")}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject
          </button>
        )}
      </div>
    </div>
  );
}
