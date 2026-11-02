"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import StatCard from "@/components/ui/StatCard";
import { api } from "@/providers/AuthProvider";

export default function UserApprovalsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [processingType, setProcessingType] = useState(null);

  const fetchPendingUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/auth/users/pending/");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch pending users. Ensure you are logged in as a Super Admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleApprove = async (user) => {
    setProcessingId(user.id);
    setProcessingType("approve");
    setActionMessage(null);
    try {
      await api.post(`/api/auth/users/${user.id}/approve/`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setActionMessage({ type: "success", text: `User "${user.username}" approved successfully.` });
    } catch (err) {
      console.error(err);
      setActionMessage({ type: "error", text: `Failed to approve user "${user.username}".` });
    } finally {
      setProcessingId(null);
      setProcessingType(null);
    }
  };

  const handleReject = async (user) => {
    const confirmed = window.confirm(
      `Are you sure you want to reject registration for "${user.username}"?\nThis will decline the request and notify the user.`
    );
    if (!confirmed) return;

    setProcessingId(user.id);
    setProcessingType("reject");
    setActionMessage(null);
    try {
      await api.post(`/api/auth/users/${user.id}/reject/`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setActionMessage({ type: "success", text: `Registration for "${user.username}" has been rejected.` });
    } catch (err) {
      console.error(err);
      setActionMessage({ type: "error", text: `Failed to reject user "${user.username}".` });
    } finally {
      setProcessingId(null);
      setProcessingType(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Header breadcrumb="SETTINGS › APPROVALS" title="User Approvals" />

        <main className="flex-1 bg-brand-cream px-4 sm:px-8 py-5 sm:py-7 pb-20 lg:pb-7 flex flex-col gap-5 sm:gap-6">
          {/* ── Stats Row ── */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              id="stat-pending-users"
              label="PENDING APPROVALS"
              value={String(users.length)}
              suffix=""
              valueColor="text-brand-red"
            />
            <StatCard
              id="stat-review-action"
              label="STATUS"
              value={users.length > 0 ? "ACTION REQ." : "UP TO DATE"}
              suffix=""
              valueColor={users.length > 0 ? "text-amber-600" : "text-brand-green"}
            />
            <StatCard
              id="stat-security-gate"
              label="REGISTRATION GATE"
              value="ACTIVE"
              suffix=""
              valueColor="text-brand-blue"
            />
          </section>

          {/* ── Action Alert Banner ── */}
          {actionMessage && (
            <div
              className={`p-4 rounded border flex items-center justify-between font-inter text-sm ${
                actionMessage.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${actionMessage.type === "success" ? "bg-green-500" : "bg-red-500"}`} />
                <span>{actionMessage.text}</span>
              </div>
              <button
                onClick={() => setActionMessage(null)}
                className="font-label text-[10px] tracking-[0.1em] uppercase opacity-70 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ── Toolbar ── */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-inter">
                {loading
                  ? "Loading pending registrations..."
                  : `${users.length} registration${users.length !== 1 ? "s" : ""} awaiting review`}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Link
                href="/user-management"
                className="px-4 py-2.5 bg-white border border-brand-border text-brand-black rounded text-[11px] font-label tracking-[0.15em] uppercase hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                All Users
              </Link>
              <button
                onClick={fetchPendingUsers}
                disabled={loading}
                className="px-4 py-2.5 bg-white border border-brand-border text-brand-black rounded text-[11px] font-label tracking-[0.15em] uppercase hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <svg className={`w-3.5 h-3.5 text-brand-red ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* ── Pending Users Table ── */}
          <div className="bg-white border border-brand-border rounded overflow-hidden shadow-sm">
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
                      Registration Date
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
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-inter text-sm">
                        Loading pending registrations...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-red-500 font-inter text-sm">
                        {error}
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-14 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h3 className="font-heading text-xl text-brand-black mb-1">No Pending Approvals</h3>
                          <p className="text-gray-500 font-inter text-xs">All user registrations have been reviewed and processed.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-brand-border last:border-b-0 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 sm:px-6 py-3.5 font-inter text-sm text-brand-black font-medium">
                          {user.username}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 font-inter text-sm text-gray-600">
                          {user.email || "—"}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 font-inter text-sm text-gray-500">
                          {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-label tracking-[0.1em] uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pending Approval
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(user)}
                              disabled={processingId === user.id}
                              className="px-3.5 py-1.5 bg-brand-green hover:bg-green-800 text-white rounded text-[10px] font-label tracking-[0.15em] uppercase transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              {processingId === user.id && processingType === "approve" ? "Approving..." : "Approve"}
                            </button>
                            <button
                              onClick={() => handleReject(user)}
                              disabled={processingId === user.id}
                              className="px-3.5 py-1.5 bg-white border border-red-500 text-brand-red hover:bg-red-50 rounded text-[10px] font-label tracking-[0.15em] uppercase transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              {processingId === user.id && processingType === "reject" ? "Rejecting..." : "Reject"}
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
    </div>
  );
}
