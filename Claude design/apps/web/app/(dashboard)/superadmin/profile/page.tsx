"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Camera,
  Loader2,
  LogOut,
  Save,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:4000/api/v1";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export default function SuperAdminProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const u = JSON.parse(stored) as UserProfile;
        setUser(u);
        setName(u.name || "");
        setAvatar(u.avatar || null);
      } catch {
        // ignore
      }
    }
    setLoading(false);
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatar(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token || !user) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, avatar: avatar || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...user, name, avatar: avatar || undefined };
        setUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        toast.success("Profile updated");
      } else {
        toast.error(data.message || "Save failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    document.cookie = "auth_token=; path=/; max-age=0";
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amnex-blue" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--ink-muted)]">Not logged in</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] p-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-amnex-blue" />
          <h1 className="text-2xl font-black text-[var(--ink-primary)]">My Profile</h1>
        </div>

        {/* Avatar + name */}
        <div className="glass rounded-2xl p-8 border border-white/5 flex flex-col items-center gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-40 h-40 rounded-full bg-slate-100 border border-[var(--glass-border)] flex items-center justify-center text-[var(--ink-muted)]">
              <UserCircle className="w-20 h-20" strokeWidth={1.2} />
            </div>
            {avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt="avatar"
                className="w-40 h-40 object-cover rounded-full border border-[var(--glass-border)]"
              />
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-amnex-blue text-white flex items-center justify-center shadow-lg hover:bg-amnex-blue/80 transition-all"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Name */}
          <div className="w-full space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)] block">
              Display Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[var(--ink-primary)] text-sm focus:outline-none focus:border-amnex-blue/50 text-center font-black text-lg"
            />
          </div>

          {/* Email (read-only) */}
          <div className="w-full space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)] block">
              Email
            </label>
            <div className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-[var(--ink-muted)] text-sm text-center">
              {user.email}
            </div>
          </div>

          {/* Role badge */}
          <span className="px-4 py-1.5 rounded-full bg-amnex-blue/10 border border-amnex-blue/20 text-amnex-blue text-[10px] font-black uppercase tracking-widest">
            {user.role.replace("_", " ")}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl btn-primary-3d text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
