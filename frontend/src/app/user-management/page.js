"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import StatCard from "@/components/ui/StatCard";
import { useAuth, api } from "@/providers/AuthProvider";

const ROLES = ["Super Admin", "Editor", "News Writer", "Publisher", "Viewer"];

// ─── Helper: derive display role from user object ───
function getUserRole(user) {
  if (user.is_superuser) return "Super Admin";
  if (user.groups && user.groups.length > 0) return user.groups[0];
  return "Viewer";
}

// ─── Helper: format API errors ───
function formatApiError(err, fallback = "Operation failed.") {
  const data = err.response?.data;
  if (!data) return err.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  const firstKey = Object.keys(data)[0];
  if (firstKey && Array.isArray(data[firstKey])) {
    return `${firstKey}: ${data[firstKey][0]}`;
  }
  return err.message || fallback;
}

// ─── Modal Backdrop ───
function ModalBackdrop({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

// ─── Add / Edit User Modal ───
function UserFormModal({ user, onClose, onSave }) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
    password: "",
    role: isEdit ? getUserRole(user) : "Viewer",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.username.trim() || !form.email.trim()) {
      setError("Username and email are required.");
      return;
    }
    if (!isEdit && !form.password) {
      setError("Password is required for new users.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const payload = {
          username: form.username,
          email: form.email,
          role: form.role,
        };
        if (form.password) {
          payload.password = form.password;
        }
        await api.patch(`/api/auth/users/${user.id}/`, payload);
      } else {
        await api.post("/api/auth/users/", {
          username: form.username,
          email: form.email,
          password: form.password,
          role: form.role,
        });
      }
      onSave();
    } catch (err) {
      setError(formatApiError(err, "Operation failed."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="bg-white rounded border border-brand-border shadow-2xl w-full max-w-md p-6 sm:p-8 font-body text-brand-black">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
          <h2 className="font-heading text-2xl font-semibold text-brand-black">
            {isEdit ? "Edit User" : "Add User"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-brand-black text-lg transition-colors">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 font-inter text-xs rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-label text-[10px] tracking-[0.15em] font-semibold text-brand-black uppercase mb-1.5">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded font-inter text-sm text-brand-black focus:outline-none focus:border-brand-gold"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="block font-label text-[10px] tracking-[0.15em] font-semibold text-brand-black uppercase mb-1.5">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded font-inter text-sm text-brand-black focus:outline-none focus:border-brand-gold"
              placeholder="Enter email"
            />
          </div>

          <div>
            <label className="block font-label text-[10px] tracking-[0.15em] font-semibold text-brand-black uppercase mb-1.5">
              Password {isEdit && <span className="text-gray-400 normal-case font-inter font-normal">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded font-inter text-sm text-brand-black focus:outline-none focus:border-brand-gold"
              placeholder={isEdit ? "••••••••" : "Enter password"}
            />
          </div>

          <div>
            <label className="block font-label text-[10px] tracking-[0.15em] font-semibold text-brand-black uppercase mb-1.5">
              Role
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded font-inter text-sm text-brand-black focus:outline-none focus:border-brand-gold"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-brand-black rounded font-label text-[11px] tracking-[0.15em] uppercase hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-brand-red text-white rounded font-label text-[11px] tracking-[0.15em] uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : isEdit ? "Update User" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  );
}

// ─── Reset Password Modal ───
function ResetPasswordModal({ user, onClose, onSave }) {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newPassword) {
      setError("Password is required.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/auth/reset-password/", {
        user_id: user.id,
        new_password: newPassword,
      });
      onSave();
    } catch (err) {
      setError(formatApiError(err, "Failed to reset password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="bg-white rounded border border-brand-border shadow-2xl w-full max-w-sm p-6 sm:p-8 font-body text-brand-black">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
          <h2 className="font-heading text-2xl font-semibold text-brand-black">Reset Password</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-brand-black text-lg transition-colors">
            ✕
          </button>
        </div>
        <p className="text-gray-500 font-inter text-xs mb-5">
          Set a new password for <span className="text-brand-black font-semibold">{user.username}</span>
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 font-inter text-xs rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-label text-[10px] tracking-[0.15em] font-semibold text-brand-black uppercase mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); if (error) setError(""); }}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded font-inter text-sm text-brand-black focus:outline-none focus:border-brand-gold"
              placeholder="Enter new password"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-brand-black rounded font-label text-[11px] tracking-[0.15em] uppercase hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-brand-red text-white rounded font-label text-[11px] tracking-[0.15em] uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  );
}

// ─── Delete Confirmation Modal ───
function DeleteConfirmModal({ user, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/auth/users/${user.id}/`);
      onConfirm();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="bg-white rounded border border-brand-border shadow-2xl w-full max-w-sm p-6 sm:p-8 font-body text-brand-black">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
          <h2 className="font-heading text-2xl font-semibold text-brand-black">Deactivate User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-brand-black text-lg transition-colors">
            ✕
          </button>
        </div>
        <p className="text-gray-500 font-inter text-xs mb-5 leading-relaxed">
          Are you sure you want to deactivate <span className="text-brand-black font-semibold">{user.username}</span>? This will immediately revoke their access.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-brand-black rounded font-label text-[11px] tracking-[0.15em] uppercase hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2.5 bg-brand-red text-white rounded font-label text-[11px] tracking-[0.15em] uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deactivating..." : "Deactivate"}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

// ─── Main Page ───
export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/api/auth/users/");
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSaved = () => {
    setShowAddModal(false);
    setEditUser(null);
    setResetUser(null);
    setDeleteUser(null);
    fetchUsers();
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          breadcrumb="SETTINGS › USERS"
          title="User Management"
        />

        <main className="flex-1 bg-brand-cream px-4 sm:px-8 py-5 sm:py-7 pb-20 lg:pb-7 flex flex-col gap-5 sm:gap-6">
          {/* ── Stats Row ── */}
          <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              id="stat-total-users"
              label="TOTAL USERS"
              value={String(users.length)}
              suffix=""
            />
            <StatCard
              id="stat-active-users"
              label="ACTIVE USERS"
              value={String(users.filter((u) => u.is_active).length)}
              suffix=""
              valueColor="text-green-600"
            />
            <StatCard
              id="stat-inactive-users"
              label="INACTIVE USERS"
              value={String(users.filter((u) => !u.is_active).length)}
              suffix=""
              valueColor="text-gray-400"
            />
          </section>

          {/* ── Toolbar ── */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-inter">
                {loading ? "Loading users..." : `${users.length} user${users.length !== 1 ? "s" : ""} found`}
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-red-600 text-white rounded text-[11px] font-label tracking-[0.15em] uppercase hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add User
            </button>
          </div>

          {/* ── Users Table ── */}
          <div className="bg-white border border-brand-border rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-brand-border bg-gray-50">
                    <th className="px-4 sm:px-6 py-3 font-label text-[10px] tracking-[0.15em] uppercase text-brand-muted">
                      Username
                    </th>
                    <th className="px-4 sm:px-6 py-3 font-label text-[10px] tracking-[0.15em] uppercase text-brand-muted">
                      Email
                    </th>
                    <th className="px-4 sm:px-6 py-3 font-label text-[10px] tracking-[0.15em] uppercase text-brand-muted">
                      Role
                    </th>
                    <th className="px-4 sm:px-6 py-3 font-label text-[10px] tracking-[0.15em] uppercase text-brand-muted">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 font-label text-[10px] tracking-[0.15em] uppercase text-brand-muted text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-b border-brand-border last:border-b-0 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 sm:px-6 py-3.5 font-inter text-sm text-brand-black font-medium">
                          {user.username}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 font-inter text-sm text-gray-600">
                          {user.email || "—"}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5">
                          <span className="inline-block px-2.5 py-1 bg-brand-cream border border-brand-border rounded text-[10px] font-label tracking-[0.1em] uppercase text-brand-black">
                            {getUserRole(user)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-label tracking-[0.1em] uppercase ${
                              user.is_active
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-red-50 text-red-600 border border-red-200"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-green-500" : "bg-red-500"}`} />
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Edit */}
                            <button
                              onClick={() => setEditUser(user)}
                              className="p-2 text-gray-400 hover:text-brand-black hover:bg-gray-100 rounded transition-colors"
                              title="Edit user"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => setResetUser(user)}
                              className="p-2 text-gray-400 hover:text-brand-black hover:bg-gray-100 rounded transition-colors"
                              title="Reset password"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                              </svg>
                            </button>

                            {/* Delete / Deactivate */}
                            <button
                              onClick={() => setDeleteUser(user)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Deactivate user"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* ── Modals ── */}
      {showAddModal && (
        <UserFormModal onClose={() => setShowAddModal(false)} onSave={handleSaved} />
      )}
      {editUser && (
        <UserFormModal user={editUser} onClose={() => setEditUser(null)} onSave={handleSaved} />
      )}
      {resetUser && (
        <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} onSave={handleSaved} />
      )}
      {deleteUser && (
        <DeleteConfirmModal user={deleteUser} onClose={() => setDeleteUser(null)} onConfirm={handleSaved} />
      )}
    </div>
  );
}
