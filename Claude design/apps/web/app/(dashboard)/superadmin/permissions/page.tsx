"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:4000/api/v1";

type Role = "SUPER_ADMIN" | "ADMIN" | "VENDOR" | "EMPLOYEE" | "CUSTOMER";
const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "VENDOR", "EMPLOYEE", "CUSTOMER"];

interface PermissionRow {
  pageKey: string;
  pageLabel: string;
  defaultRoles: Role[];
  overrides?: Partial<Record<Role, boolean>>;
}

interface PendingChange {
  pageKey: string;
  role: Role;
  allowed: boolean;
}

const LOCKED_PAGES = ["superadmin"];

export default function PermissionsPage() {
  const router = useRouter();
  const [matrix, setMatrix] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch(`${API_BASE}/permissions/matrix`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data) return;
        const inner = data?.data ?? data;
        const rows = Array.isArray(inner)
          ? inner
          : Array.isArray(inner?.matrix)
            ? inner.matrix
            : [];
        setMatrix(rows);
      })
      .catch(() => toast.error("Failed to load permissions"))
      .finally(() => setLoading(false));
  }, [router]);

  const isEffective = (row: PermissionRow, role: Role): boolean => {
    const override = row.overrides?.[role];
    if (override !== undefined) return override;
    return row.defaultRoles.includes(role);
  };

  const togglePermission = (pageKey: string, role: Role) => {
    setMatrix((prev) =>
      prev.map((row) => {
        if (row.pageKey !== pageKey) return row;
        const current = isEffective(row, role);
        const overrides = { ...row.overrides, [role]: !current };
        return { ...row, overrides };
      })
    );
    setPendingChanges((prev) => {
      const existing = prev.findIndex((p) => p.pageKey === pageKey && p.role === role);
      const row = matrix.find((r) => r.pageKey === pageKey);
      const current = row ? isEffective(row, role) : false;
      const change = { pageKey, role, allowed: !current };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = change;
        return updated;
      }
      return [...prev, change];
    });
  };

  const handleSave = async () => {
    const token = localStorage.getItem("auth_token");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/permissions/matrix`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ changes: pendingChanges }),
      });
      if (res.ok) {
        toast.success("Permissions saved");
        setPendingChanges([]);
      } else {
        const data = await res.json();
        toast.error(data.message || "Save failed");
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

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-amnex-blue" />
            <div>
              <h1 className="text-2xl font-black text-[var(--ink-primary)]">Permissions</h1>
              <p className="text-sm text-[var(--ink-muted)]">RBAC matrix — control page-level access per role</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || pendingChanges.length === 0}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em]",
              pendingChanges.length > 0 ? "btn-primary-3d" : "btn-secondary-3d opacity-50 cursor-not-allowed"
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes {pendingChanges.length > 0 && `(${pendingChanges.length})`}
          </button>
        </div>

        {/* Matrix table */}
        <div className="glass rounded-2xl border border-white/5 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)] w-48">
                  Page
                </th>
                {ROLES.map((r) => (
                  <th key={r} className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)]">
                    {r.replace("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => {
                const isLocked = LOCKED_PAGES.some((lp) => row.pageKey.includes(lp));
                return (
                  <motion.tr
                    key={row.pageKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-[var(--ink-primary)]">{row.pageLabel}</span>
                      <span className="block text-[10px] text-[var(--ink-muted)] font-mono">{row.pageKey}</span>
                    </td>
                    {ROLES.map((r) => {
                      const effective = isEffective(row, r);
                      return (
                        <td key={r} className="px-4 py-4 text-center">
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => togglePermission(row.pageKey, r)}
                            aria-pressed={effective}
                            className={cn("toggle-3d", effective && "on")}
                          >
                            <span className={cn("toggle-3d-thumb")} />
                          </button>
                        </td>
                      );
                    })}
                  </motion.tr>
                );
              })}
              {matrix.length === 0 && (
                <tr>
                  <td colSpan={ROLES.length + 1} className="px-4 py-12 text-center text-[var(--ink-muted)] text-sm">
                    No pages configured
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
