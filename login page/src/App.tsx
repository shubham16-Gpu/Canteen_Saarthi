/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  UserCircle, 
  Truck, 
  Mail, 
  Lock, 
  Smartphone, 
  Key, 
  ArrowRight, 
  CheckCircle2, 
  Loader2,
  Building2,
  Fingerprint,
  Info,
  X,
  Phone,
  MapPin,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';
import type { UserRole, AuthState, User } from './types';

// --- Schemas ---

// Declaring global google for GIS library
declare global {
  interface Window {
    google: any;
  }
}

const loginSchema = z.object({
  email: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
  vendorCode: z.string().optional(),
  mobile: z.string().optional(),
});

const otpSchema = z.object({
  code: z.string().length(6, 'Must be exactly 6 digits'),
});

// --- Main App Component ---

export default function App() {
  const [role, setRole] = useState<UserRole>('admin');
  const [authState, setAuthState] = useState<AuthState>({ 
    role: 'admin', 
    step: 'credentials' 
  });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'none' | 'method' | 'verify'>('none');
  const [otpType, setOtpType] = useState<'email' | 'mobile' | 'authenticator' | null>(null);
  const [authenticatorSetup, setAuthenticatorSetup] = useState<{ secret: string, uri: string } | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [mockOtp, setMockOtp] = useState<string | null>(null);
  const [showSimulatedSms, setShowSimulatedSms] = useState(false);

  // Initialize Google Identity Services
  useEffect(() => {
    if (showSimulatedSms) {
      const timer = setTimeout(() => setShowSimulatedSms(false), 15000);
      return () => clearTimeout(timer);
    }
  }, [showSimulatedSms]);

  useEffect(() => {
    if (role === 'employee' && authState.step === 'credentials') {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId || clientId === "google_client_id_placeholder") return;

      const initGsi = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
            ux_mode: 'popup',
            cancel_on_tap_outside: true
          });
          // Render the centered button
          const container = document.getElementById('google-btn-container');
          if (container) {
            window.google.accounts.id.renderButton(container, {
              theme: 'outline',
              size: 'large',
              width: container.offsetWidth || 320,
              shape: 'pill',
              text: 'signin_with'
            });
          }
        } else {
          setTimeout(initGsi, 100);
        }
      };
      initGsi();
    }
  }, [role, authState.step]);

  const handleGoogleCredentialResponse = async (response: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const result = await res.json();
      
      if (res.ok) {
        toast.success('Google identity confirmed');
        setAuthState({ ...authState, step: 'success' });
        setUser({ ...result.user, role: 'employee' });
      } else {
        toast.error(result.error || 'Identity verification failed');
      }
    } catch (err) {
      toast.error('Identity sync error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Authenticator setup on mount or when help is opened
  useEffect(() => {
    let retryTimeout: NodeJS.Timeout;
    const fetchSetup = () => {
      fetch('/api/auth/authenticator-setup')
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then(data => setAuthenticatorSetup(data))
        .catch(err => {
          console.error('Authenticator setup fetch failed, retrying...', err);
          retryTimeout = setTimeout(fetchSetup, 3000);
        });
    };

    if (showHelp && !authenticatorSetup && role === 'superadmin') {
      fetchSetup();
    }

    return () => clearTimeout(retryTimeout);
  }, [showHelp, authenticatorSetup, role]);

  // Sync role to authState when tab changes
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setAuthState({ role: newRole, step: 'credentials' });
    setEmailPreviewUrl(null);
    setMockOtp(null);
  };

  const DataCoreAnimation = () => (
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
            style={{ margin: `${(i + 1) * 60}px`, animationDuration: `${20 + i * 10}s` }}
          />
        ))}
      </div>
    </div>
  );

  // --- Sub-components ---

  const RoleTab = ({ id, label }: { id: UserRole, label: string }) => (
    <button
      id={`tab-${id}`}
      onClick={() => handleRoleChange(id)}
      className={cn(
        "flex-1 py-3 text-[10px] font-black uppercase tracking-[0.12em] rounded-xl transition-all duration-500 border border-transparent",
        role === id 
          ? "bg-amnex-blue text-white shadow-[0_10px_25px_-5px_rgba(0,121,255,0.5)] scale-[1.08] border-white/40 z-10" 
          : "text-white/40 hover:text-white/70 hover:bg-white/5"
      )}
    >
      {label}
    </button>
  );

  const StatusIndicator = () => (
    <div className="flex items-center gap-2 mb-6 bg-white/5 p-1 rounded-full w-fit border border-white/5 backdrop-blur-md">
      {['credentials', 'security', 'success'].map((s, i) => {
        const isCurrent = (s === 'credentials' && authState.step === 'credentials') || 
                          (s === 'security' && (authState.step === 'otp' || authState.step === 'authenticator')) ||
                          (s === 'success' && authState.step === 'success');
        const isDone = (s === 'credentials' && authState.step !== 'credentials') ||
                       (s === 'security' && authState.step === 'success');
        
        return (
          <div key={s} className="flex items-center">
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all",
              isCurrent ? "bg-amnex-blue text-white shadow-lg shadow-amnex-blue/30 scale-110" : isDone ? "bg-emerald-500 text-white" : "text-white/20 bg-transparent border border-white/10"
            )}>
              {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            {i < 2 && <div className="w-3 h-px bg-white/10 mx-1" />}
          </div>
        );
      })}
    </div>
  );

  const SecurityAuditView = () => {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
      const fetchLogs = () => {
        fetch('/api/admin/logs')
          .then(res => res.json())
          .then(data => setLogs(data))
          .catch(() => {});
      };
      
      fetchLogs();
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }, []);

    if (logs.length === 0) {
      return <p className="text-[9px] text-white/20 italic">No events recorded in this session...</p>;
    }

    return (
      <div className="space-y-2">
        {logs.map(log => (
          <div key={log.id} className="flex justify-between items-start gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
            <div className="flex flex-col gap-0.5">
              <p className={cn(
                "text-[9px] font-black uppercase tracking-[0.05em]",
                log.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
              )}>
                {log.event}
              </p>
              <p className="text-[8px] text-white/40 font-medium">
                {log.details}
              </p>
            </div>
            <span className="text-[7px] font-mono text-white/20 mt-0.5">
              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const AdminContactModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-amnex-navy/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] shadow-2xl p-6 lg:p-10 max-w-2xl w-full relative overflow-hidden flex flex-col lg:flex-row gap-8 max-h-[90vh] overflow-y-auto lg:overflow-hidden"
      >
        <button onClick={() => setShowHelp(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors z-20">
          <X className="w-5 h-5 text-slate-400" />
        </button>

        {/* Left: Contact Info */}
        <div className="w-full lg:w-1/2">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-amnex-blue/10 text-amnex-blue rounded-2xl flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-amnex-navy leading-none">Administrative Operations</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Facility Coordination</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <Mail className="w-5 h-5 text-amnex-blue mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Admin Email Protocol</p>
                <p className="text-sm font-bold text-amnex-navy">Admin access requires a 6-digit verification code delivered via corporate email (admin@amnex.com).</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-amnex-blue/5 rounded-2xl border border-amnex-blue/10">
              <ShieldCheck className="w-5 h-5 text-amnex-blue mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-amnex-blue uppercase tracking-widest mb-1">Security Verification</p>
                <p className="text-xs font-bold text-slate-500">Each OTP is valid for 5 minutes and single-use only.</p>
              </div>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Portal Demo Access Details</p>
              <div className="space-y-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Admin Authorization</span>
                  <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-amnex-navy">admin@amnex.com</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1 rounded">pw: password123</span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Super User Authorization</span>
                  <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-amnex-navy">super@amnex.com</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1 rounded">pw: password123</span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendor Authorization</span>
                  <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-amnex-navy">VEND001</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1 rounded">pw: 9876543210</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Security Setup (Super Admin ONLY) */}
        {role === 'superadmin' && (
          <div className="w-full lg:w-1/2 lg:pl-8 lg:border-l border-slate-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                <Fingerprint className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-amnex-navy leading-none">Security Deployment</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Google Authenticator Integration</p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 text-center shadow-inner relative overflow-hidden">
              {authenticatorSetup ? (
                <div className="space-y-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-3 rounded-2xl inline-block shadow-2xl"
                  >
                    <QRCodeCanvas 
                      value={authenticatorSetup.uri} 
                      size={128}
                      level="H"
                      includeMargin={true}
                    />
                  </motion.div>
                  
                  <div className="space-y-4 text-left">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Protocol Secret (Google Authenticator)</p>
                      <code className="text-amnex-blue font-mono font-bold text-[10px] bg-white/5 py-2 px-3 rounded-lg block border border-white/5 overflow-x-auto whitespace-nowrap">{authenticatorSetup.secret}</code>
                    </div>
                    
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-black text-amnex-blue uppercase tracking-widest">Live Security Audit</p>
                        <div className="flex gap-1">
                          <div className="w-1 h-1 bg-amnex-blue rounded-full animate-pulse" />
                          <div className="w-1 h-1 bg-amnex-blue rounded-full animate-pulse delay-75" />
                          <div className="w-1 h-1 bg-amnex-blue rounded-full animate-pulse delay-150" />
                        </div>
                      </div>
                      <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                        <SecurityAuditView />
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] text-white/50 font-bold leading-relaxed px-4">
                    Scan this identity token using **Google Authenticator** to enable Super Admin clearance.
                  </p>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-amnex-blue" />
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Retrieving Protocol...</p>
                  <button 
                    onClick={() => {
                      setAuthenticatorSetup(null);
                      fetch('/api/auth/authenticator-setup')
                        .then(res => res.json())
                        .then(data => setAuthenticatorSetup(data));
                    }}
                    className="mt-2 text-[9px] text-amnex-blue hover:text-white font-black uppercase tracking-widest transition-colors"
                  >
                    Manual Sync Retry
                  </button>
                </div>
              )}
            </div>

            <p className="mt-6 text-[10px] text-slate-400 font-bold leading-relaxed">
              Google Authenticator TOTP protocol active. Managed by Amnex Security Core.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );

  const PrivacyPolicyModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-amnex-navy/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto relative"
      >
        <button onClick={() => setShowPrivacy(false)} className="fixed top-12 right-12 p-3 bg-white shadow-xl rounded-full transition-transform hover:scale-110 z-10">
          <X className="w-6 h-6 text-amnex-navy" />
        </button>
        
        <div className="flex items-baseline gap-2 mb-8">
           <span className="text-2xl font-black tracking-tighter text-amnex-navy">AMNEX</span>
           <span className="text-sm font-bold text-slate-400">Privacy Policy</span>
        </div>

        <div className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed space-y-6">
          <p className="font-bold text-amnex-navy text-lg">Your Privacy is Our Priority</p>
          <p>
            Amnex Infotechnologies Private Limited is committed to protecting the privacy and security of your personal data. This Privacy Policy outlines our practices regarding the collection, use, and disclosure of information when you use our services.
          </p>
          
          <h4 className="font-black text-amnex-navy uppercase tracking-widest text-xs mt-8">1. Information Collection</h4>
          <p> We collect information that you provide directly to us when you create or modify your account, or contact support. This includes Name, Email, Employee/Vendor ID, and Phone number.</p>

          <h4 className="font-black text-amnex-navy uppercase tracking-widest text-xs mt-8">2. Purpose of Use</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li>To provide and maintain our authentication services.</li>
            <li>To authenticate identity through multi-layer verification (OTP, Google Authenticator).</li>
            <li>To monitor system health and security.</li>
          </ul>

          <h4 className="font-black text-amnex-navy uppercase tracking-widest text-xs mt-8">3. Data Security</h4>
          <p>We implement a variety of security measures including AES-256 encryption and TLS 1.3 to maintain the safety of your personal information. Access is strictly controlled based on organizational roles.</p>
          
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between mt-10">
            <div>
              <p className="font-bold text-amnex-navy">View Full Policy</p>
              <p className="text-xs text-slate-500">Visit our official website for full transparency</p>
            </div>
            <a href="https://amnex.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-amnex-blue font-bold text-xs uppercase tracking-widest hover:underline">
              Official Site <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const PasswordRecoveryModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-amnex-navy/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-md w-full text-center"
      >
        {recoveryStep === 'method' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-amnex-blue/10 text-amnex-blue rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Key className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-amnex-navy">Recover Credentials</h3>
            <p className="text-sm text-slate-500">Identity-based recovery procedure initiated.</p>
            
            <div className="p-6 border-y border-slate-100 space-y-4">
              {role === 'superadmin' && (
                <div className="text-left bg-slate-50 p-4 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Required Method</p>
                  <p className="text-sm font-bold text-amnex-navy flex items-center gap-2">
                    <Fingerprint className="w-4 h-4" /> Google Authenticator Sync
                  </p>
                </div>
              )}
              {role === 'admin' && (
                <div className="text-left bg-slate-50 p-4 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Required Method</p>
                  <p className="text-sm font-bold text-amnex-navy flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email Verification Loop
                  </p>
                </div>
              )}
              {role === 'vendor' && (
                <div className="text-left bg-slate-50 p-4 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Required Method</p>
                  <p className="text-sm font-bold text-amnex-navy flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Manual Admin Approval
                  </p>
                </div>
              )}
            </div>

            <button 
              onClick={() => {
                if (role === 'vendor') {
                  toast.info('Recovery request sent to Admin Dept.');
                  setRecoveryStep('none');
                } else {
                  setRecoveryStep('verify');
                  setOtpType(role === 'superadmin' ? 'authenticator' : 'email');
                }
              }}
              className="w-full bg-amnex-blue text-white font-black py-4 rounded-xl uppercase text-xs tracking-[0.2em] hover:bg-amnex-navy transition-all"
            >
              {role === 'vendor' ? 'Notify Admin' : 'Begin Verification'}
            </button>
            <button onClick={() => setRecoveryStep('none')} className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-amnex-navy transition-colors">Go Back</button>
          </div>
        )}

        {recoveryStep === 'verify' && (
          <div className="space-y-8">
             <div className="w-16 h-16 bg-amnex-blue/10 text-amnex-blue rounded-3xl flex items-center justify-center mx-auto">
              <Smartphone className="w-8 h-8" />
             </div>
             <h3 className="text-2xl font-black text-amnex-navy">Verify Recovery</h3>
             <p className="text-sm text-slate-500">Security challenge code sent.</p>
             
             <div className="flex justify-center">
               <input 
                 className="w-full max-w-[280px] h-16 text-center text-3xl font-black bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amnex-blue transition-all"
                 placeholder="••••••"
                 maxLength={6}
               />
             </div>

             <button 
              onClick={() => {
                toast.success('Identity recovered! Reset password sent.');
                setRecoveryStep('none');
              }}
              className="w-full bg-amnex-blue text-white font-black py-4 rounded-xl uppercase text-xs tracking-[0.2em]"
            >
              Confirm Signature
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );

  // --- Authentication Handlers ---

  const onCredentialSubmit = async (data: any) => {
    setLoading(true);
    try {
      if (role === 'vendor') {
        const res = await fetch('/api/auth/vendor-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, role })
        });
        const result = await res.json();
        if (res.ok) {
          setAuthState({ ...authState, step: 'otp', identifier: result.identifier });
          setMockOtp(result.mockOtp || null);
          setShowSimulatedSms(true);
          toast.success('Security PIN synchronized');
        } else {
          toast.error(result.error);
        }
      } else {
        const res = await fetch('/api/auth/credential-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, role })
        });
        const result = await res.json();
        if (res.ok) {
          setAuthState({ ...authState, step: result.nextStep === 'authenticator' ? 'authenticator' : 'otp', identifier: data.email });
          setEmailPreviewUrl(result.previewUrl || null);
          setMockOtp(result.otp || null);
          setShowSimulatedSms(true);
          
          if (result.previewUrl) {
            toast.success('Security OTP sent!', {
              description: 'Gateway ready.',
              action: {
                label: 'Inbox',
                onClick: () => window.open(result.previewUrl, '_blank')
              },
              duration: 5000
            });
          } else {
            toast.success(role === 'superadmin' ? 'Authenticator required' : 'OTP issued');
          }
        } else {
          toast.error(result.error);
        }
      }
    } catch (err) {
      toast.error('Identity network error');
    } finally {
      setLoading(false);
    }
  };

  const onTwoFactorSubmit = async (data: { code: string }) => {
    setLoading(true);
    try {
      const endpoint = authState.step === 'authenticator' ? '/api/auth/verify-authenticator' : '/api/auth/verify-otp';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          [authState.step === 'authenticator' ? 'code' : 'otp']: data.code,
          role,
          identifier: authState.identifier 
        })
      });
      const result = await res.json();
      if (res.ok) {
        setAuthState({ ...authState, step: 'success' });
        setUser({ 
          email: authState.identifier || 'user@amnex.com', 
          name: role.charAt(0).toUpperCase() + role.slice(1), 
          role 
        });
        toast.success(`Welcome back, ${role}!`);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSSO = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === "google_client_id_placeholder") {
      toast.error('Google SSO requires a valid Client ID.');
      return;
    }
  };

  // --- Success View ---

  if (authState.step === 'success' && user) {
    return (
      <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
        <Toaster position="top-center" expand={true} richColors />
        
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-amnex-blue/5 blur-[120px] rounded-full" />
           <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-amnex-blue/5 blur-[120px] rounded-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#0d1117] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl relative z-10"
        >
          <div className="p-8 lg:p-12">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-8 h-8 bg-amnex-blue rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Amnex Identity</h2>
                <p className="text-[10px] text-amnex-blue font-bold uppercase tracking-widest">Clearance Verified</p>
              </div>
            </div>

            <h3 className="text-4xl font-black text-white mb-10 tracking-tight leading-tight italic">Access<br/>Granted.</h3>
            
            <div className="space-y-4 mb-12">
              <div className="flex items-center gap-5 p-5 bg-white/[0.02] border border-white/5 rounded-3xl group hover:bg-white/[0.04] transition-colors">
                <div className="w-16 h-16 bg-gradient-to-br from-amnex-blue to-blue-700 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-amnex-blue/20">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-black text-white truncate tracking-tight">
                    {user.name}
                  </p>
                  <p className="text-xs font-bold text-white/30 truncate tracking-wide">
                    {user.email}
                  </p>
                </div>
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1.5">Authorization</p>
                  <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Active Level</p>
                </div>
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1.5">Role Signature</p>
                  <p className="text-xs font-black text-white/60 uppercase tracking-widest">{user.role}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-white text-black text-[11px] font-black py-6 rounded-2xl uppercase tracking-[0.3em] hover:scale-[1.02] transition-all active:scale-95 shadow-2xl shadow-white/5"
            >
              Terminate Session
            </button>
          </div>

          <div className="px-12 py-8 bg-white/[0.01] border-t border-white/5 flex justify-between items-center">
            <div className="flex gap-6">
              {user.role === 'superadmin' && (
                <button 
                  onClick={() => setShowHelp(true)}
                  className="text-[10px] font-black text-amnex-blue uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
                >
                  Admin Panel
                </button>
              )}
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest hover:text-white/50 cursor-pointer transition-colors">Security</span>
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest hover:text-white/50 cursor-pointer transition-colors">Logs</span>
            </div>
            <div className="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1 h-1 bg-amnex-blue rounded-full" />
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} IST
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-4 lg:p-12 font-sans selection:bg-amnex-blue selection:text-white relative overflow-hidden">
      <Toaster position="top-center" richColors />

      {/* Simulated SMS Notification */}
      <AnimatePresence>
        {showSimulatedSms && mockOtp && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"
          >
            <div className="bg-[#0d1117] shadow-2xl rounded-2xl p-4 border border-white/5 flex items-start gap-4 cursor-pointer" onClick={() => setShowSimulatedSms(false)}>
              <div className="w-10 h-10 bg-amnex-blue rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-amnex-blue/20">
                <MessageSquare className="text-white w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-[9px] uppercase tracking-widest text-white/40">Security Subsystem</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
                  </div>
                </div>
                <p className="text-xs font-bold text-white/60 leading-snug">
                  Security Code: <span className="text-white font-black tracking-[0.2em]">{mockOtp}</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Optimized Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-amnex-blue/[0.03] blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-amnex-blue/[0.02] blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl h-full min-h-[640px] glass dark-glass rounded-[40px] overflow-hidden flex flex-col lg:flex-row relative z-10 shadow-2xl border border-white/5">
        
        {/* Modals Handling */}
        <AnimatePresence>
          {showHelp && <AdminContactModal />}
          {showPrivacy && <PrivacyPolicyModal />}
          {recoveryStep !== 'none' && <PasswordRecoveryModal />}
        </AnimatePresence>

        {/* Left Brand Column */}
        <div className="lg:w-5/12 p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden bg-amnex-navy shrink-0 border-b lg:border-b-0 lg:border-r border-white/5">
          {/* Geometric Data Fabric Essence */}
          <div className="absolute inset-0 data-fabric-pattern animate-fabric opacity-20 pointer-events-none" />
          <div className="absolute inset-0 animate-scan opacity-10 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-amnex-blue/10 to-transparent pointer-events-none" />
          
          <DataCoreAnimation />

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none hidden lg:block"
          >
            <svg width="200" height="200" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="48" stroke="white" strokeWidth="0.1" strokeDasharray="1 3" />
              <circle cx="50" cy="50" r="35" stroke="white" strokeWidth="0.05" />
            </svg>
          </motion.div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              {/* BRAND LOGO */}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black tracking-[-0.05em] text-white">AMNEX</span>
                <div className="w-1.5 h-1.5 bg-amnex-blue rounded-full mb-1 ml-0.5" />
              </div>
            </div>
            
            <h1 className="text-4xl font-light leading-[1.1] mb-6 tracking-tight text-white/90">
              High-Security <br/>
              <span className="font-black text-white">Access Portal</span>
            </h1>
            <p className="text-white/60 leading-relaxed max-w-xs text-xs font-bold tracking-tight">
              Enterprise-grade authentication gateway for Amnex global operations. 
              Encrypted multi-layer verification active.
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
          {/* Subtle Ambient Light */}
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
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Identity Gateway</h2>
          </motion.div>

          {/* Role Selector Glass Version */}
          <AnimatePresence mode="wait">
            {authState.step === 'credentials' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex p-1.5 bg-white/5 backdrop-blur-2xl rounded-2xl mb-10 relative z-10 border border-white/10"
              >
                <RoleTab id="superadmin" label="Super Admin" />
                <RoleTab id="admin" label="Admin" />
                <RoleTab id="employee" label="Employee" />
                <RoleTab id="vendor" label="Vendor" />
              </motion.div>
            )}
          </AnimatePresence>


          <StatusIndicator />

          {role === 'superadmin' && authState.step === 'credentials' && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-amnex-blue font-black uppercase tracking-[0.2em] mb-6 text-center animate-pulse"
            >
              Add Authenticator
            </motion.p>
          )}

          {/* Forms Area */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {authState.step === 'credentials' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <CredentialForm 
                    role={role} 
                    onSubmit={onCredentialSubmit} 
                    loading={loading} 
                    onForgot={() => setRecoveryStep('method')}
                    onGoogleSSO={handleGoogleSSO}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="2fa"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-10"
                >
                  <div className="text-center">
                    <div className="w-20 h-20 bg-amnex-blue/10 text-amnex-blue rounded-[2.5rem] border border-amnex-blue/10 flex items-center justify-center mx-auto mb-8 shadow-inner">
                      {authState.step === 'authenticator' ? <Fingerprint className="w-10 h-10" /> : <Smartphone className="w-10 h-10" />}
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
                      {authState.step === 'authenticator' ? 'Identity Synchronization' : 'Layer 2 Verification'}
                    </h3>
                    <p className="text-white/40 text-sm font-bold leading-relaxed max-w-[280px] mx-auto tracking-tight">
                      {authState.step === 'authenticator' 
                        ? 'Submit the 6-digit dynamic code from your Google Authenticator app.'
                        : `Enter the code sent to your ${role === 'vendor' ? 'mobile' : 'email'} account ${authState.identifier}.`
                      }
                    </p>
                  </div>
                  
                  <TwoFactorForm 
                    onSubmit={onTwoFactorSubmit} 
                    loading={loading}
                    type={authState.step as 'authenticator' | 'otp'}
                    role={role}
                    mockOtp={mockOtp}
                  />

                  {authState.step === 'otp' && emailPreviewUrl && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 bg-amnex-blue/10 rounded-2xl border border-amnex-blue/20 text-center"
                    >
                      <p className="text-[10px] font-black text-amnex-blue uppercase tracking-widest mb-2">Simulated Secure Email</p>
                      <a 
                        href={emailPreviewUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-white bg-amnex-blue px-4 py-2 rounded-lg text-xs font-bold hover:bg-amnex-navy transition-all inline-flex items-center gap-2"
                      >
                        Access Inbox <ExternalLink className="w-3 h-3" />
                      </a>
                    </motion.div>
                  )}

                  <button 
                    onClick={() => setAuthState({ ...authState, step: 'credentials' })}
                    className="w-full text-white/30 hover:text-white/60 font-black text-[10px] uppercase tracking-[0.3em] transition-all"
                  >
                    Cancel Authentication
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Subtext */}
          <div className="mt-auto pt-10 flex items-center justify-between text-[9px] text-white/20 font-black uppercase tracking-[0.2em] border-t border-white/10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Amnex Secure Gateway</span>
            </div>
            <div className="flex gap-6">
              <button onClick={() => setShowPrivacy(true)} className="cursor-pointer hover:text-white/60 transition-colors">Privacy Policy</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Specialized Form Components ---

function CredentialForm({ role, onSubmit, loading, onForgot, onGoogleSSO }: { role: UserRole, onSubmit: (data: any) => void, loading: boolean, onForgot: () => void, onGoogleSSO: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit'
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 lg:space-y-6">
      {role === 'employee' && (
        <div className="space-y-6 pb-6 border-b border-white/10">
          <div id="google-btn-container" className="w-full flex justify-center py-2 min-h-[44px]">
            {(!import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID === "google_client_id_placeholder") && (
              <button
                type="button"
                onClick={onGoogleSSO}
                className="flex items-center justify-center gap-3 w-[320px] bg-white hover:bg-slate-100 text-slate-800 font-medium py-2 px-4 rounded-full transition-all shadow-sm border border-slate-200"
              >
                 <svg className="w-5 h-5" viewBox="0 0 24 24">
                   <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                   <path d="M12 23c2.97 0 5.46-1 7.28-2.69l-3.57-2.77c-.99.69-2.26 1.1-3.71 1.1-2.87 0-5.3-1.94-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                   <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                   <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                 </svg>
                 Sign in with Google
              </button>
            )}
          </div>
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <span className="relative px-4 text-[9px] font-black text-white/20 uppercase bg-amnex-navy tracking-widest">or legacy access</span>
          </div>
        </div>
      )}
      {role === 'vendor' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] ml-1">Vendor ID</label>
            <input 
              {...register('vendorCode')}
              id="vendorCode"
              placeholder="e.g. VEND001"
              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-amnex-blue focus:bg-white/10 transition-all placeholder:text-white/10"
            />
            {errors.vendorCode && <p className="mt-1.5 text-[10px] font-bold text-red-500 uppercase">{errors.vendorCode.message as string}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] ml-1">Mobile No</label>
            <div className="relative">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                {...register('mobile')}
                id="mobile"
                type="tel"
                placeholder="9876543210"
                className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-amnex-blue focus:bg-white/10 transition-all placeholder:text-white/10"
              />
            </div>
            {errors.mobile && <p className="mt-1.5 text-[10px] font-bold text-red-500 uppercase">{errors.mobile.message as string}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] ml-1">Work Email</label>
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input 
              {...register('email')}
              id="email"
              type="email"
              placeholder={role === 'admin' ? 'admin@amnex.com' : 'super@amnex.com'}
              className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-amnex-blue focus:bg-white/10 transition-all placeholder:text-white/10"
            />
          </div>
          {errors.email && <p className="mt-1.5 text-[10px] font-bold text-red-500 uppercase">{errors.email.message as string}</p>}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between items-center ml-1">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em]">Password</label>
          <button 
            type="button"
            onClick={onForgot} 
            className="text-[9px] text-amnex-blue font-black uppercase hover:text-white transition-colors tracking-widest"
          >
            Forgot Password?
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input 
            {...register('password')}
            id="password"
            type="password"
            placeholder="••••••••"
            className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-amnex-blue focus:bg-white/10 transition-all placeholder:text-white/10"
          />
        </div>
        {errors.password && <p className="mt-1.5 text-[10px] font-bold text-red-500 uppercase">{errors.password.message as string}</p>}
      </div>

      <button 
        type="submit"
        disabled={loading}
        className="w-full bg-amnex-blue hover:bg-white hover:text-amnex-navy text-white font-black py-4.5 rounded-2xl shadow-xl shadow-black/40 transition-all mt-6 flex items-center justify-center gap-3 group uppercase text-xs tracking-[0.2em]"
      >
        <span>Authorize & Proceed</span>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
      </button>
    </form>
  );
}

function TwoFactorForm({ onSubmit, loading, role, mockOtp }: { onSubmit: (data: any) => void, loading: boolean, type: 'authenticator' | 'otp', role: UserRole, mockOtp: string | null }) {
  const [timer, setTimer] = useState(60);
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(otpSchema)
  });

  const otpValue = watch('code', '');

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  useEffect(() => {
    if (otpValue.length === 6 && !loading) {
      handleSubmit(onSubmit)();
    }
  }, [otpValue, loading, handleSubmit, onSubmit]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-6">
        {mockOtp && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl mb-4">
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Dev Environment Bypass</p>
            <p className="text-xs font-bold text-white">Your security code is: <span className="text-amnex-blue text-lg tracking-widest">{mockOtp}</span></p>
          </div>
        )}
        <div className="flex justify-center w-full relative">
          <AnimatePresence>
            {loading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1.1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 bg-amnex-blue/5 blur-2xl rounded-full animate-pulse-slow pointer-events-none"
              />
            )}
          </AnimatePresence>
          <input 
            {...register('code')}
            id="otp-code"
            type="text"
            maxLength={6}
            autoFocus
            className="w-full max-w-[320px] h-20 text-center text-4xl font-black bg-white/5 border border-white/10 rounded-[1.5rem] focus:border-amnex-blue outline-none transition-all tracking-[0.4em] text-white placeholder:text-white/5 selection:bg-amnex-blue relative z-10"
            placeholder="••••••"
          />
        </div>
        {errors.code && <p className="text-[10px] font-bold text-red-500 tracking-widest uppercase">{errors.code.message as string}</p>}
      </div>
      
      <div className="pt-6 border-t border-white/5 text-center">
        <button 
          onClick={handleSubmit(onSubmit)}
          disabled={loading || otpValue.length !== 6}
          className={cn(
            "w-full font-black py-4.5 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]",
            otpValue.length === 6 
              ? "bg-white text-amnex-navy hover:bg-slate-200" 
              : "bg-white/5 text-white/20 cursor-not-allowed"
          )}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Verifying Registry...</span>
            </div>
          ) : 'Confirm Signature'}
        </button>
        
        <p className="mt-8 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
          No challenge received? <button 
            type="button" 
            disabled={timer > 0}
            className={cn("transition-colors", timer > 0 ? "text-white/10 cursor-not-allowed" : "text-amnex-blue hover:text-white")}
          >
            Resend Code {timer > 0 && `(${timer}s)`}
          </button>
        </p>
      </div>
    </div>
  );
}

