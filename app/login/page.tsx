"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Factory, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAccounts = [
    { email: "admin@deepakcellulose.com", role: "Super Admin", dept: "Executive" },
    { email: "warehouse@deepakcellulose.com", role: "Warehouse Manager", dept: "RM Stores" },
    { email: "qc@deepakcellulose.com", role: "QC/QA Manager", dept: "Quality" },
    { email: "production@deepakcellulose.com", role: "Production Manager", dept: "Manufacturing" },
    { email: "purchase@deepakcellulose.com", role: "Purchase Officer", dept: "Procurement" },
    { email: "dispatch@deepakcellulose.com", role: "Dispatch Officer", dept: "Logistics" },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoSelect = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("demo123");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-4">
          <Factory className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Deepak Cellulose ERP
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Digital Operations & Enterprise Manufacturing Execution System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80 sm:px-10">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Sign in to your account</h3>
            <p className="text-xs text-slate-500 mt-0.5">Enter your enterprise credentials to access your modules</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@deepakcellulose.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[11px] text-slate-400">Demo pwd: demo123</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...
                </>
              ) : (
                <>
                  Sign In to ERP <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Quick Persona Sign-In:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {demoAccounts.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => handleQuickDemoSelect(d.email)}
                  className="p-2 text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition cursor-pointer"
                >
                  <div className="text-[11px] font-bold text-slate-800 truncate">{d.role}</div>
                  <div className="text-[10px] text-slate-500 truncate">{d.dept}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            New employee without an account?{" "}
            <Link href="/register" className="text-blue-600 font-semibold hover:underline">
              Submit Access Request
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-400">
          Protected by Deepak Cellulose Corporate Security Policy • GMP & FDA Compliant
        </div>
      </div>
    </div>
  );
}
