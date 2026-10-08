"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Building2,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type UserRole = "CUSTOMER" | "VENDOR" | "ADMIN" | "EMPLOYEE";

const API_BASE = "http://localhost:4000/api/v1";

interface SchemaField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

interface Schema {
  fields: SchemaField[];
}

const DEFAULT_SCHEMAS: Record<string, Schema> = {
  CUSTOMER: {
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Password", type: "password", required: true },
    ],
  },
  EMPLOYEE: {
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true },
      { name: "email", label: "Work Email", type: "email", required: true },
    ],
  },
  VENDOR: {
    fields: [
      { name: "name", label: "Business Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Password", type: "password", required: true },
      { name: "phone", label: "Phone", type: "tel", required: false },
    ],
  },
  ADMIN: {
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Password", type: "password", required: true },
    ],
  },
};

export default function RegisterPage() {
  const params = useSearchParams();
  const initialRole: UserRole = (() => {
    const q = params?.get("role")?.toUpperCase();
    if (q === "VENDOR" || q === "ADMIN" || q === "EMPLOYEE" || q === "CUSTOMER") return q;
    return "CUSTOMER";
  })();
  const [role, setRole] = useState<UserRole>(initialRole);
  const [schema, setSchema] = useState<Schema>(DEFAULT_SCHEMAS[initialRole] || { fields: [] });
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = role;
    fetch(`${API_BASE}/vendor-form/template?category=${key}`)
      .then((r) => r.json())
      .then((data) => {
        // backend returns { success, template: { ..., schema: { fields } } }
        // be tolerant of all wrapping variants
        const s =
          data?.template?.schema ||
          data?.data?.template?.schema ||
          data?.schema ||
          data?.data?.schema ||
          data;
        if (s && Array.isArray(s.fields)) {
          setSchema(s);
        } else {
          setSchema(DEFAULT_SCHEMAS[key] || { fields: [] });
        }
      })
      .catch(() => setSchema(DEFAULT_SCHEMAS[key] || { fields: [] }));
  }, [role]);

  const handleChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGoogleRegister = async (credential: string) => {
    setGoogleLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/multi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "google", credential }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const { token, user } = data.data;
        localStorage.setItem("auth_token", token);
        localStorage.setItem("user", JSON.stringify(user));
        document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        toast.success("Welcome!");
        setTimeout(() => router.push("/employee/today"), 600);
      } else {
        toast.error(data.message || "Google sign-in failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Registration successful!");
        setTimeout(() => router.push("/login"), 800);
      } else {
        toast.error(data.message || "Registration failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const roles: { id: UserRole; label: string }[] = [
    { id: "CUSTOMER", label: "Customer" },
    { id: "EMPLOYEE", label: "Employee" },
    { id: "VENDOR", label: "Vendor" },
  ];

  return (
    <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-[32px] p-8 border border-white/5"
        >
          <div className="mb-8">
            <h1 className="text-2xl font-black text-white mb-2">Create Account</h1>
            <p className="text-[var(--ink-muted)] text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-amnex-blue hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          {/* Role selector */}
          <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={cn(
                  "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  role === r.id
                    ? "bg-amnex-blue text-white shadow-lg"
                    : "text-white/40 hover:text-white/70"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Google SSO for employees */}
          {role === "EMPLOYEE" && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => {
                  const w = window as any;
                  if (w.google?.accounts?.id) {
                    w.google.accounts.id.prompt();
                  } else {
                    toast.error("Google Sign-In not loaded. Check NEXT_PUBLIC_GOOGLE_CLIENT_ID.");
                  }
                }}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 bg-white text-[#001b3d] py-3 px-4 rounded-xl font-bold text-sm hover:bg-white/90 transition-all"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
                    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
                    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
                  </svg>
                )}
                Continue with Google
              </button>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </div>
          )}

          {/* Dynamic form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {schema.fields.map((field) => (
              <div key={field.name}>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)] mb-2">
                  {field.label}
                </label>
                {field.type === "select" ? (
                  <select
                    value={form[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amnex-blue/50"
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    value={form[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amnex-blue/50 resize-none"
                  />
                ) : (
                  <input
                    type={field.type}
                    value={form[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                    placeholder={field.placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amnex-blue/50"
                  />
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary-3d py-3 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
