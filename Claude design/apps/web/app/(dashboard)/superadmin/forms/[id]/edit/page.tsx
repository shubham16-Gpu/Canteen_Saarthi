"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:4000/api/v1";

interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  schema: { fields: FormField[] };
}

const FIELD_TYPES = ["text", "email", "tel", "number", "date", "select", "textarea", "password"];

export default function FormEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch(`${API_BASE}/vendor-form/templates/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setTemplate(data?.data || data))
      .catch(() => toast.error("Failed to load form"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const updateField = (index: number, key: keyof FormField, value: unknown) => {
    if (!template) return;
    const fields = [...template.schema.fields];
    fields[index] = { ...fields[index], [key]: value };
    setTemplate({ ...template, schema: { fields } });
  };

  const addField = () => {
    if (!template) return;
    const fields = [...template.schema.fields, { name: "", label: "", type: "text" }];
    setTemplate({ ...template, schema: { fields } });
  };

  const removeField = (index: number) => {
    if (!template) return;
    const fields = template.schema.fields.filter((_, i) => i !== index);
    setTemplate({ ...template, schema: { fields } });
  };

  const handleSave = async () => {
    if (!template) return;
    const token = localStorage.getItem("auth_token");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/vendor-form/templates/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          schema: template.schema,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Form saved");
      } else {
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

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--ink-muted)]">Form not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] p-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back */}
        <Link
          href="/superadmin/forms"
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)] hover:text-amnex-blue transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Forms
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[var(--ink-primary)]">Edit Form</h1>
            <p className="text-sm text-[var(--ink-muted)]">{template.category}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-3 rounded-xl btn-primary-3d text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>

        {/* Metadata */}
        <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)] mb-2 block">Form Name</label>
            <input
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[var(--ink-primary)] text-sm focus:outline-none focus:border-amnex-blue/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)] mb-2 block">Description</label>
            <textarea
              value={template.description}
              onChange={(e) => setTemplate({ ...template, description: e.target.value })}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[var(--ink-primary)] text-sm focus:outline-none focus:border-amnex-blue/50 resize-none"
            />
          </div>
        </div>

        {/* Fields */}
        <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)]">
              Fields ({template.schema.fields.length})
            </h2>
            <button
              onClick={addField}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amnex-blue hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Field
            </button>
          </div>

          {template.schema.fields.map((field, i) => (
            <motion.div
              key={i}
              layout
              className="border border-white/10 rounded-xl p-4 space-y-3 bg-white/[0.02]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)]">
                  Field {i + 1}
                </span>
                <button
                  onClick={() => removeField(i)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[var(--ink-muted)] block mb-1">Name</label>
                  <input
                    value={field.name}
                    onChange={(e) => updateField(i, "name", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[var(--ink-primary)] text-sm focus:outline-none focus:border-amnex-blue/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--ink-muted)] block mb-1">Label</label>
                  <input
                    value={field.label}
                    onChange={(e) => updateField(i, "label", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[var(--ink-primary)] text-sm focus:outline-none focus:border-amnex-blue/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--ink-muted)] block mb-1">Type</label>
                  <select
                    value={field.type}
                    onChange={(e) => updateField(i, "type", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[var(--ink-primary)] text-sm focus:outline-none focus:border-amnex-blue/50"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id={`required-${i}`}
                    checked={field.required || false}
                    onChange={(e) => updateField(i, "required", e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor={`required-${i}`} className="text-xs text-[var(--ink-muted)]">Required</label>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
