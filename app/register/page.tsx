"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Factory, ShieldCheck, Mail, Lock, User, Phone, Briefcase, CheckCircle2, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedDepts, setSelectedDepts] = useState<string[]>(["Warehouse"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const availableDepartments = [
    { id: "Warehouse", label: "Raw Materials Warehouse & Stores", desc: "Quarantine, bin storage & GRN intake" },
    { id: "QA", label: "Quality Control & Assurance (QC/QA)", desc: "Material testing, COA verification & release" },
    { id: "Production", label: "Manufacturing & Batch BMR", desc: "Reactor operation, stage execution & yield" },
    { id: "Procurement", label: "Procurement & Purchase Orders", desc: "Supplier POs, commercial contracts & terms" },
    { id: "Dispatch", label: "Customer Orders & Dispatch", desc: "Finished goods sales orders & delivery challans" },
    { id: "Accounts", label: "Commercial Accounts & 3-Way Match", desc: "Invoices, weighbridge bill matching & payments" },
  ];

  const toggleDept = (deptId: string) => {
    if (selectedDepts.includes(deptId)) {
      if (selectedDepts.length > 1) {
        setSelectedDepts(selectedDepts.filter((d) => d !== deptId));
      }
    } else {
      setSelectedDepts([...selectedDepts, deptId]);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          employeeCode,
          phone,
          requestedDepartments: selectedDepts,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit registration");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-4">
          <Factory className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Employee Onboarding & Access Request
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Deepak Cellulose ERP Access Authorization Gateway
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80 sm:px-10">
          {submitted ? (
            <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 border border-amber-200 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Application Submitted for Admin Approval
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-slate-900">{fullName}</strong>. Your profile has been registered in the system under pending status.
              </p>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2 text-xs">
                <div className="text-slate-500 font-semibold uppercase text-[10px]">What happens next?</div>
                <ul className="space-y-1.5 text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>The System Administrator will verify your credentials and role requirements.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>You requested access to: <strong className="text-slate-800">{selectedDepts.join(", ")}</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Once approved, you will be able to log in with your email ({email}) and password.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition inline-flex items-center gap-2"
                >
                  Return to Login <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900">New Employee Profile Registration</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete your details. System administrator authorization is required before first sign-in.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-700 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{error}</div>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Anand Patel"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Work Email *
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Employee Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. DC-104"
                        value={employeeCode}
                        onChange={(e) => setEmployeeCode(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white"
                    />
                  </div>
                </div>

                {/* Requested Functional Departments (Multiple can be selected!) */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    Select Assigned Functional Departments *
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Select all responsibilities that apply to your post (e.g. you can be both Warehouse & QA):
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableDepartments.map((dept) => {
                      const isChecked = selectedDepts.includes(dept.id);
                      return (
                        <div
                          key={dept.id}
                          onClick={() => toggleDept(dept.id)}
                          className={`p-2.5 rounded-xl border transition cursor-pointer text-xs ${
                            isChecked
                              ? "bg-blue-50/80 border-blue-400 text-blue-900 shadow-xs"
                              : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{dept.label}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded text-blue-600 pointer-events-none"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{dept.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting Request...
                      </>
                    ) : (
                      <>
                        Submit Onboarding Request <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
                Already approved?{" "}
                <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                  Sign in here
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
