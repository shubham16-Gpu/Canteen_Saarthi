"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Phone,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Toaster, toast } from "sonner";
import { cn } from "@/lib/utils";

type UserRole = "superadmin" | "admin" | "vendor" | "customer";

const loginSchema = z.object({
  email: z.string().optional(),
  password: z.string().min(1, "Password is required"),
  vendorCode: z.string().optional(),
  mobile: z.string().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

const ROLE_DEFAULTS: Record<UserRole, { email: string; password: string }> = {
  superadmin: { email: "admin@canteen.app", password: "admin@123" },
  admin: { email: "admin@canteen.app", password: "admin@123" },
  vendor: { email: "", password: "" },
  customer: { email: "", password: "" },
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("superadmin");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    defaultValues: ROLE_DEFAULTS.superadmin,
  });

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    const defaults = ROLE_DEFAULTS[newRole];
    setValue("email", defaults.email);
    setValue("password", defaults.password);
  };

  const onSubmit = async (data: LoginValues) => {
    setLoading(true);
    try {
      const email = role === "vendor" ? data.vendorCode : data.email;
      const password = data.password;

      const res = await fetch("http://localhost:4000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        const token = result.data.access_token;
        const user = result.data.user;
        localStorage.setItem("auth_token", token);
        localStorage.setItem("user", JSON.stringify(user));
        document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        toast.success(`Welcome back, ${user.name}!`);
        setTimeout(() => router.push("/admin"), 600);
      } else {
        const message =
          result?.error?.message || result?.message || "Invalid credentials";
        toast.error(Array.isArray(message) ? message[0] : message);
      }
    } catch {
      toast.error("Network error — is the API running on port 4000?");
    } finally {
      setLoading(false);
    }
  };

  const RoleTab = ({ id, label }: { id: UserRole; label: string }) => (
    <button
      type="button"
      onClick={() => handleRoleChange(id)}
      className={cn(
        "flex-1 py-3 text-[10px] font-black uppercase tracking-[0.12em] rounded-xl transition-all duration-500 border border-transparent",
        role === id
          ? "bg-amnex-blue text-white shadow-[0_10px_25px_-5px_rgba(0,86,179,0.5)] scale-[1.08] border-white/40 z-10"
          : "text-white/40 hover:text-white/70 hover:bg-white/5",
      )}
    >
      {label}
    </button>
  );

  const StatusIndicator = () => (
    <div className="flex items-center gap-2 mb-6 bg-white/5 p-1 rounded-full w-fit border border-white/5 backdrop-blur-md">
      {["credentials", "security", "success"].map((s, i) => {
        const isCurrent = s === "credentials";
        return (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all",
                isCurrent
                  ? "bg-amnex-blue text-white shadow-lg shadow-amnex-blue/30 scale-110"
                  : "text-white/20 bg-transparent border border-white/10",
              )}
            >
              {i + 1}
            </div>
            {i < 2 && <div className="w-3 h-px bg-white/10 mx-1" />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-4 lg:p-12 font-sans selection:bg-amnex-blue selection:text-white relative overflow-hidden">
      <Toaster position="top-center" richColors />

      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-amnex-blue/[0.03] blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-amnex-blue/[0.02] blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl h-full min-h-[640px] glass rounded-[40px] overflow-hidden flex flex-col lg:flex-row relative z-10 shadow-2xl border border-white/5">
        {/* Left Brand Column */}
        <div className="lg:w-5/12 p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden bg-amnex-navy shrink-0 border-b lg:border-b-0 lg:border-r border-white/5">
          <div className="absolute inset-0 data-fabric-pattern animate-fabric opacity-20 pointer-events-none" />
          <div className="absolute inset-0 animate-scan opacity-10 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-amnex-blue/10 to-transparent pointer-events-none" />

          <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
            <div className="relative w-full h-full max-w-[400px] max-h-[400px]">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }}
                transition={{ duration: 6, repeat: Infinity }}
                className="absolute inset-0 bg-amnex-blue/10 blur-[80px] rounded-full"
              />
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="absolute inset-0 border border-white/[0.02] rounded-full animate-spin"
                  style={{
                    margin: `${(i + 1) * 60}px`,
                    animationDuration: `${20 + i * 10}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none hidden lg:block"
          >
            <svg width="200" height="200" viewBox="0 0 100 100" fill="none">
              <circle
                cx="50"
                cy="50"
                r="48"
                stroke="white"
                strokeWidth="0.1"
                strokeDasharray="1 3"
              />
              <circle cx="50" cy="50" r="35" stroke="white" strokeWidth="0.05" />
            </svg>
          </motion.div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black tracking-[-0.05em] text-white">
                  CANTEEN
                </span>
                <div className="w-1.5 h-1.5 bg-amnex-blue rounded-full mb-1 ml-0.5" />
              </div>
            </div>

            <h1 className="text-4xl font-light leading-[1.1] mb-6 tracking-tight text-white/90">
              Enterprise <br />
              <span className="font-black text-white">Management Portal</span>
            </h1>
            <p className="text-white/60 leading-relaxed max-w-xs text-xs font-bold tracking-tight">
              Multi-role canteen operations gateway. Real-time orders, inventory
              control, and vendor management — all in one secure platform.
            </p>
          </div>

          <div className="space-y-6 relative z-10 pt-10 border-t border-white/10">
            <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.2em] text-white/30 uppercase">
              <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
              Network Status: SECURE
            </div>
          </div>
        </div>

        {/* Right Login Column */}
        <div className="lg:w-7/12 p-8 lg:p-10 flex flex-col relative bg-gradient-to-br from-amnex-navy via-[#002452] to-amnex-navy/95 backdrop-blur-3xl overflow-hidden min-h-[500px]">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-amnex-blue/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amnex-blue/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute inset-0 animate-scan opacity-10 pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-right relative z-10"
          >
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em]">
              Authorized Gateway Protocol Active
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative z-10 mb-8"
          >
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
              Identity Gateway
            </h2>
          </motion.div>

          <div className="flex p-1.5 bg-white/5 backdrop-blur-2xl rounded-2xl mb-10 relative z-10 border border-white/10">
            <RoleTab id="superadmin" label="Super Admin" />
            <RoleTab id="admin" label="Admin" />
            <RoleTab id="vendor" label="Vendor" />
            <RoleTab id="customer" label="Customer" />
          </div>

          <StatusIndicator />

          {role === "superadmin" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-amnex-blue font-black uppercase tracking-[0.2em] mb-6 text-center"
            >
              Privileged Access
            </motion.p>
          )}

          <div className="flex-1 relative z-10">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 lg:space-y-6"
            >
              {role === "vendor" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] ml-1">
                      Vendor ID
                    </label>
                    <input
                      {...register("vendorCode")}
                      placeholder="e.g. VEND001"
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-amnex-blue focus:bg-white/10 transition-all placeholder:text-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] ml-1">
                      Mobile No
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input
                        {...register("mobile")}
                        type="tel"
                        placeholder="9876543210"
                        className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-amnex-blue focus:bg-white/10 transition-all placeholder:text-white/10"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] ml-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="admin@canteen.app"
                      className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-amnex-blue focus:bg-white/10 transition-all placeholder:text-white/10"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 text-[10px] font-bold text-red-500 uppercase">
                      {errors.email.message as string}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => toast.info("Contact your administrator")}
                    className="text-[9px] text-amnex-blue font-black uppercase hover:text-white transition-colors tracking-widest"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    {...register("password")}
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-amnex-blue focus:bg-white/10 transition-all placeholder:text-white/10"
                  />
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-[10px] font-bold text-red-500 uppercase">
                    {errors.password.message as string}
                  </p>
                )}
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">
                  Demo Credentials
                </p>
                <p className="text-xs font-bold text-white">
                  admin@canteen.app
                  <span className="text-white/40 mx-2">/</span>
                  <span className="text-amnex-blue tracking-widest">admin@123</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amnex-blue hover:bg-white hover:text-amnex-navy text-white font-black py-4 rounded-2xl shadow-xl shadow-black/40 transition-all mt-6 flex items-center justify-center gap-3 group uppercase text-xs tracking-[0.2em]"
              >
                <span>Authorize & Proceed</span>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                )}
              </button>
            </form>
          </div>

          <div className="mt-auto pt-10 flex items-center justify-between text-[9px] text-white/20 font-black uppercase tracking-[0.2em] border-t border-white/10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Canteen Secure Gateway</span>
            </div>
            <div className="flex gap-6">
              <span className="cursor-pointer hover:text-white/60 transition-colors">
                Privacy Policy
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
