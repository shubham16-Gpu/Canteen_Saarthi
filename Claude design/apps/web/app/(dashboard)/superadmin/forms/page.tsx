"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  FileText,
  Loader2,
  Pencil,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:4000/api/v1";

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export default function FormsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch(`${API_BASE}/vendor-form/templates`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data) return;
        const inner = data?.data ?? data;
        const list = Array.isArray(inner)
          ? inner
          : Array.isArray(inner?.items)
            ? inner.items
            : Array.isArray(inner?.templates)
              ? inner.templates
              : [];
        setTemplates(list);
      })
      .catch(() => toast.error("Failed to load form templates"))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = templates.filter((t) => {
    const q = search.toLowerCase();
    return (
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[var(--ink-primary)]">Vendor Forms</h1>
            <p className="text-sm text-[var(--ink-muted)]">{templates.length} form templates</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search forms..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--ink-primary)] text-sm focus:outline-none focus:border-amnex-blue/50"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-5 border border-white/5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-amnex-blue/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amnex-blue" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)] bg-white/5 px-2 py-1 rounded-lg">
                  {t.category}
                </span>
              </div>

              <div>
                <h3 className="font-black text-[var(--ink-primary)] text-sm leading-tight">{t.name}</h3>
                <p className="text-xs text-[var(--ink-muted)] mt-1 line-clamp-2">{t.description}</p>
              </div>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                <span className="text-[10px] text-[var(--ink-muted)]">
                  Updated {new Date(t.updatedAt).toLocaleDateString("en-IN")}
                </span>
                <Link
                  href={`/superadmin/forms/${t.id}/edit`}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amnex-blue hover:underline"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </Link>
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-[var(--ink-muted)] text-sm">
              No form templates found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
