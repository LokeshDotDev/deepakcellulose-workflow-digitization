"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit2,
  Lock,
  Plus,
  Search,
  Check,
  X,
  AlertCircle,
  Filter,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface AdminUsersClientProps {
  initialUsers: any[];
  roles: any[];
  departments: any[];
  currentUser: any;
}

const AVAILABLE_EXTRA_PERMISSIONS = [
  { code: "PO_APPROVE", label: "PO Authorization & Release", desc: "Can approve commercial purchase orders" },
  { code: "BATCH_OVERRIDE", label: "BMR Parameter Override", desc: "Can sign off and bypass unconfigured parameters" },
  { code: "DISPATCH_AUTHORIZE", label: "Dispatch Challan Release", desc: "Can sign off finished goods outbound delivery" },
  { code: "GATE_PASS_CREATE", label: "Security Weighbridge Pass", desc: "Can log vehicle entry and gross/tare weights" },
  { code: "QC_SPEC_MODIFY", label: "QC Specification Alteration", desc: "Can modify test acceptance criteria" },
  { code: "INV_ADJUST", label: "Manual Inventory Adjustment", desc: "Can perform stock write-off or balance adjustment" },
];

export function AdminUsersClient({
  initialUsers,
  roles,
  departments,
  currentUser,
}: AdminUsersClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [activeTab, setActiveTab] = useState<"PENDING" | "ACTIVE">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal State for Approve / Edit
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<"APPROVE" | "EDIT" | null>(null);

  // Form State in Modal
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedCustomPerms, setSelectedCustomPerms] = useState<string[]>([]);
  const [userIsActive, setUserIsActive] = useState(true);

  const pendingUsers = users.filter((u) => u.approvalStatus === "PENDING" || (!u.isActive && u.approvalStatus !== "REJECTED"));
  const activeUsers = users.filter((u) => u.approvalStatus === "APPROVED" && u.isActive);

  const openApproveModal = (u: any) => {
    setSelectedUser(u);
    setModalMode("APPROVE");
    setSelectedDeptId(u.departmentId || departments[0]?.id || "");
    setSelectedRoleIds(u.userRoles?.map((ur: any) => ur.roleId) || []);
    setSelectedCustomPerms(u.customPermissions || []);
    setUserIsActive(true);
  };

  const openEditModal = (u: any) => {
    setSelectedUser(u);
    setModalMode("EDIT");
    setSelectedDeptId(u.departmentId || departments[0]?.id || "");
    setSelectedRoleIds(u.userRoles?.map((ur: any) => ur.roleId) || []);
    setSelectedCustomPerms(u.customPermissions || []);
    setUserIsActive(u.isActive);
  };

  const toggleRole = (roleId: string) => {
    if (selectedRoleIds.includes(roleId)) {
      setSelectedRoleIds(selectedRoleIds.filter((id) => id !== roleId));
    } else {
      setSelectedRoleIds([...selectedRoleIds, roleId]);
    }
  };

  const toggleCustomPerm = (permCode: string) => {
    if (selectedCustomPerms.includes(permCode)) {
      setSelectedCustomPerms(selectedCustomPerms.filter((p) => p !== permCode));
    } else {
      setSelectedCustomPerms([...selectedCustomPerms, permCode]);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    setMsg(null);

    const action = modalMode === "APPROVE" ? "APPROVE_USER" : "UPDATE_ROLES_PERMISSIONS";

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId: selectedUser.id,
          departmentId: selectedDeptId,
          roleIds: selectedRoleIds,
          customPermissions: selectedCustomPerms,
          isActive: userIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");

      setMsg({ type: "success", text: data.message || "User updated successfully" });
      setModalMode(null);
      setSelectedUser(null);
      router.refresh();
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                approvalStatus: "APPROVED",
                isActive: userIsActive,
                departmentId: selectedDeptId,
                department: departments.find((d) => d.id === selectedDeptId),
                customPermissions: selectedCustomPerms,
                userRoles: selectedRoleIds.map((rId) => ({
                  roleId: rId,
                  role: roles.find((r) => r.id === rId),
                })),
              }
            : u
        )
      );
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!confirm("Are you sure you want to reject this onboarding registration?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT_USER",
          userId,
          rejectionReason: "Administrative decision",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject user");

      setMsg({ type: "success", text: "User registration rejected." });
      router.refresh();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, approvalStatus: "REJECTED", isActive: false } : u))
      );
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const displayedList = (activeTab === "PENDING" ? pendingUsers : activeUsers).filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.employeeCode && u.employeeCode.toLowerCase().includes(q)) ||
      (u.department?.name && u.department.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Messages */}
      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "PENDING"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Pending Onboarding Approvals
            {pendingUsers.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white text-amber-700 text-[10px] font-bold">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "ACTIVE"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Active Plant Personnel ({activeUsers.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee, email, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 transition"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {activeTab === "PENDING" ? "Onboarding Requests Awaiting Approval" : "Authorized System Users Matrix"}
          </span>
          <span className="text-xs text-slate-500 font-medium">{displayedList.length} Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Requested / Assigned Post</th>
                <th className="py-3 px-4">Assigned Roles & Scopes</th>
                <th className="py-3 px-4">Extra Permissions</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {displayedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    {activeTab === "PENDING"
                      ? "No pending onboarding registrations. All applications processed!"
                      : "No active users found matching search criteria."}
                  </td>
                </tr>
              ) : (
                displayedList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{u.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {u.employeeCode ? `Emp ID: ${u.employeeCode}` : "No Emp Code"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-800 text-[11px]">{u.email}</div>
                      <div className="text-[10px] text-slate-500">{u.phone || "No Phone"}</div>
                    </td>
                    <td className="py-3 px-4">
                      {activeTab === "PENDING" ? (
                        <div className="p-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-medium text-[11px]">
                          Requested: {u.requestedDepartments || "General Operations"}
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-800">
                          {u.department?.name || "System Admin"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.userRoles?.length > 0 ? (
                          u.userRoles.map((ur: any) => (
                            <span
                              key={ur.roleId || ur.role.id}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              {ur.role?.name || "Role"}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">None assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.customPermissions && u.customPermissions.length > 0 ? (
                          u.customPermissions.map((cp: string) => (
                            <span
                              key={cp}
                              className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                              {cp}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {u.approvalStatus === "PENDING" || !u.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Pending Approval
                        </span>
                      ) : u.approvalStatus === "REJECTED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {activeTab === "PENDING" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openApproveModal(u)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] shadow-xs cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Assign
                          </button>
                          <button
                            onClick={() => handleRejectUser(u.id)}
                            className="px-2 py-1 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold text-[11px] cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-[11px] shadow-2xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" /> Edit Roles & Permissions
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Assignment & Approval Dialog */}
      {modalMode && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {modalMode === "APPROVE" ? "Authorize & Onboard Employee" : "Configure User Roles & Permissions"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedUser.fullName} ({selectedUser.email})
                </p>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Requested departments info banner if onboarding */}
              {modalMode === "APPROVE" && selectedUser.requestedDepartments && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-bold">Applicant Request:</div>
                  <div>User requested access to: <strong>{selectedUser.requestedDepartments}</strong></div>
                </div>
              )}

              {/* Department Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Department Post *
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white text-slate-800 outline-none"
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Multiple Roles Assignment */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Assign Roles (One User Can Have Multiple Roles) *
                  </label>
                  <span className="text-[11px] text-blue-600 font-semibold">
                    {selectedRoleIds.length} Selected
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/50">
                  {roles.map((r) => {
                    const isChecked = selectedRoleIds.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleRole(r.id)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer transition ${
                          isChecked
                            ? "bg-blue-50 border-blue-400 text-blue-900 shadow-2xs"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{r.name}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-blue-600 pointer-events-none"
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.code}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Granular Extra Permissions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Grant Granular Extra Permissions (Without Changing Actual Role)
                  </label>
                  <span className="text-[11px] text-emerald-600 font-semibold">
                    {selectedCustomPerms.length} Granted
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border border-slate-200 rounded-xl bg-slate-50/50">
                  {AVAILABLE_EXTRA_PERMISSIONS.map((perm) => {
                    const isChecked = selectedCustomPerms.includes(perm.code);
                    return (
                      <div
                        key={perm.code}
                        onClick={() => toggleCustomPerm(perm.code)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer transition ${
                          isChecked
                            ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{perm.label}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-emerald-600 pointer-events-none"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{perm.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Account Active Toggle */}
              {modalMode === "EDIT" && (
                <div className="pt-2 flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Account Login Access</div>
                    <div className="text-[11px] text-slate-500">Allow this user to sign in to the ERP</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={userIsActive}
                    onChange={(e) => setUserIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedRoleIds.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {loading
                    ? "Saving..."
                    : modalMode === "APPROVE"
                    ? "Approve & Grant System Access"
                    : "Save Roles & Permissions"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
