"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Send,
  CheckCircle2,
  Users,
  RefreshCw,
  Smartphone,
  Plus,
  Trash2,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Share2,
  Heart,
  ShieldCheck,
  AlertCircle,
  FileText,
  Clock
} from "lucide-react";
import Link from "next/link";

function InstagramIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

export default function InstagramDashboardPage() {
  const [activeTab, setActiveTab] = useState("dm"); // 'dm' | 'handles' | 'queue'

  // Devices & News
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [approvedNews, setApprovedNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [refreshingNews, setRefreshingNews] = useState(false);

  // DM Compose state
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [selectedNewsId, setSelectedNewsId] = useState(null);
  const [customMessage, setCustomMessage] = useState("");
  const [targetUsernames, setTargetUsernames] = useState("");
  const [isSendingDm, setIsSendingDm] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Target Handles Directory state (empty default, persisted in browser)
  const [savedHandles, setSavedHandles] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("instagram_target_handles");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedHandles(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const saveHandles = (updated) => {
    setSavedHandles(updated);
    try {
      localStorage.setItem("instagram_target_handles", JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };
  const [newHandle, setNewHandle] = useState("");
  const [newHandleName, setNewHandleName] = useState("");
  const [newHandleCategory, setNewHandleCategory] = useState("General");
  const [selectedHandleIds, setSelectedHandleIds] = useState([]);

  // Queue state
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [queueFilter, setQueueFilter] = useState("ALL");

  // Fetch Approved News
  const fetchApprovedNews = useCallback(async () => {
    try {
      setRefreshingNews(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/masters/api/editor/article/?status=APPROVED`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.results || []);
        const formatted = items.map((n) => ({
          id: n.id,
          headline: n.title || (typeof n.content === "object" && n.content?.title) || "No Title",
          summary:
            n.seo_desc ||
            (n.edited_content
              ? n.edited_content.substring(0, 160) + "..."
              : typeof n.content === "string"
              ? n.content.substring(0, 160) + "..."
              : n.content?.body_content
              ? n.content.body_content.substring(0, 160) + "..."
              : "No summary available."),
          url: n.source_url || "",
        }));
        setApprovedNews(formatted);
      }
    } catch (err) {
      console.error("Failed to fetch approved news:", err);
    } finally {
      setLoadingNews(false);
      setRefreshingNews(false);
    }
  }, []);

  // Fetch Devices
  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/devices", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.results || []);
        setDevices(list);
        if (list.length > 0 && !activeDeviceId) {
          setActiveDeviceId(list[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    } finally {
      setLoadingDevices(false);
    }
  }, [activeDeviceId]);

  // Fetch Queue Tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        // Filter tasks for Instagram
        const igTasks = list.filter(
          (t) => (t.platform || t.task_type || "").toLowerCase() === "instagram"
        );
        setTasks(igTasks);
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovedNews();
    fetchDevices();
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [fetchApprovedNews, fetchDevices, fetchTasks]);

  // When a news article is selected, populate message
  const handleSelectNews = (article) => {
    if (selectedNewsId === article.id) {
      setSelectedNewsId(null);
      setCustomMessage("");
    } else {
      setSelectedNewsId(article.id);
      const text = `📰 BREAKING: ${article.headline}\n\n${article.summary}${article.url ? `\n\nRead more: ${article.url}` : ""}`;
      setCustomMessage(text);
    }
  };

  // Quick toggle saved handle into targetUsernames
  const toggleSavedHandle = (handle) => {
    const clean = handle.replace(/^@/, "").trim();
    const currentList = targetUsernames
      .split(/[\n,]/)
      .map((s) => s.trim().replace(/^@/, ""))
      .filter(Boolean);

    if (currentList.includes(clean)) {
      const updated = currentList.filter((h) => h !== clean);
      setTargetUsernames(updated.map((h) => `@${h}`).join(", "));
    } else {
      const updated = [...currentList, clean];
      setTargetUsernames(updated.map((h) => `@${h}`).join(", "));
    }
  };

  // Add new handle to directory
  const handleAddHandle = (e) => {
    e.preventDefault();
    if (!newHandle.trim()) return;
    const clean = newHandle.replace(/^@/, "").trim();
    const updated = [
      ...savedHandles,
      {
        id: Date.now(),
        handle: clean,
        name: newHandleName.trim() || clean,
        category: newHandleCategory,
      },
    ];
    saveHandles(updated);
    setNewHandle("");
    setNewHandleName("");
  };

  const handleDeleteHandle = (id) => {
    const updated = savedHandles.filter((h) => h.id !== id);
    saveHandles(updated);
  };

  // Submit DMs
  const handleSendInstagramDMs = async () => {
    if (!activeDeviceId) {
      setFeedbackMessage({ type: "error", text: "Please select an assigned Android device." });
      return;
    }
    const recipients = targetUsernames
      .split(/[\n,]/)
      .map((u) => u.trim().replace(/^@/, ""))
      .filter(Boolean);

    if (recipients.length === 0) {
      setFeedbackMessage({ type: "error", text: "Please enter at least one target Instagram username." });
      return;
    }
    if (!customMessage.trim()) {
      setFeedbackMessage({ type: "error", text: "Please compose a message or select an approved news article." });
      return;
    }

    try {
      setIsSendingDm(true);
      setFeedbackMessage(null);

      const tasksPayload = recipients.map((username) => ({
        device_id: activeDeviceId,
        contact_number: username, // Used as target recipient
        message: customMessage.trim(),
        platform: "instagram",
      }));

      const res = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: tasksPayload }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTargetUsernames("");
        setSelectedNewsId(null);
        setFeedbackMessage(null);
        fetchTasks();
        setActiveTab("queue");
      } else {
        setFeedbackMessage({
          type: "error",
          text: data.error || data.message || "Failed to enqueue Instagram tasks.",
        });
      }
    } catch (err) {
      setFeedbackMessage({ type: "error", text: "Network error: " + err.message });
    } finally {
      setIsSendingDm(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (queueFilter === "ALL") return true;
    return (t.status || "").toUpperCase() === queueFilter;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 min-h-[750px]">
      {/* ── Top Header Banner & Navigation ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white shadow-md">
              <InstagramIcon className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Instagram Automation</h1>
              <p className="text-xs text-gray-500">
                Automated Direct Messages &amp; Headlines dispatch to Instagram handles.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200 self-stretch md:self-auto justify-around">
          <div className="text-center px-2.5">
            <div className="text-lg font-bold text-gray-900">{devices.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Devices</div>
          </div>
          <div className="h-6 w-px bg-gray-200" />
          <div className="text-center px-2.5">
            <div className="text-lg font-bold text-gray-900">{tasks.filter(t => t.status === "PENDING" || t.status === "PROCESSING").length}</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">In Queue</div>
          </div>
          <div className="h-6 w-px bg-gray-200" />
          <div className="text-center px-2.5">
            <div className="text-lg font-bold text-gray-900">{tasks.filter(t => t.status === "COMPLETED").length}</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Sent</div>
          </div>
        </div>
      </div>

      {/* ── Sub-tab Navigation ── */}
      <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1 w-fit">
        <button
          onClick={() => setActiveTab("dm")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "dm"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Send className="w-3.5 h-3.5" /> Direct Messages &amp; News
        </button>
        <button
          onClick={() => setActiveTab("handles")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "handles"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Target Usernames ({savedHandles.length})
        </button>
        <button
          onClick={() => { setActiveTab("queue"); fetchTasks(); }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "queue"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Task Queue ({tasks.length})
        </button>
      </div>

      {/* Error banner only (no static success banner) */}
      {feedbackMessage && feedbackMessage.type === "error" && (
        <div className="p-3.5 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── TAB 1: DM COMPOSER ── */}
      {activeTab === "dm" && (
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-h-[580px]">
          {/* Left Column: Device + News Selection (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Device Selector Card */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-gray-700" /> Dispatch Device
                </label>
                <Link
                  href="/dashboard/manage-devices"
                  className="text-xs text-gray-700 hover:underline flex items-center gap-1 font-medium"
                >
                  Manage <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {loadingDevices ? (
                <div className="text-xs text-gray-400 py-3">Detecting devices...</div>
              ) : devices.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  No automation devices registered yet. Connect your Android app to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {devices.map((d) => {
                    const isSelected = activeDeviceId === d.id;
                    const isOnline = d.status === "ACTIVE" || d.is_online;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setActiveDeviceId(d.id)}
                        className={`text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                          isSelected
                            ? "border-gray-900 bg-gray-50 ring-2 ring-gray-900/10"
                            : "border-gray-200 hover:border-gray-300 bg-gray-50/50"
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {d.name || `Device #${d.id}`}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {d.phone_number || "No Phone Assigned"}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isOnline
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-gray-100 text-gray-600 border border-gray-300"
                          }`}
                        >
                          {isOnline ? "ONLINE" : "STANDBY"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Approved Editorial News Picker */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-gray-700" /> Select Approved Article
                </label>
                <button
                  type="button"
                  onClick={fetchApprovedNews}
                  disabled={refreshingNews}
                  className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshingNews ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>

              {loadingNews ? (
                <div className="text-xs text-gray-400 py-6 text-center">Loading approved news...</div>
              ) : approvedNews.length === 0 ? (
                <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded-lg text-center">
                  No approved news available yet. Approve articles in the Editorial section.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {approvedNews.map((article) => {
                    const isSelected = selectedNewsId === article.id;
                    return (
                      <div
                        key={article.id}
                        onClick={() => handleSelectNews(article)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                          isSelected
                            ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900/20"
                            : "border-gray-100 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-gray-900 line-clamp-2">
                            {article.headline}
                          </h4>
                          {isSelected && (
                            <span className="text-gray-700 font-bold text-xs shrink-0">✓</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                          {article.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Composer & Target Handles (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gray-700" /> Compose Instagram DM
              </h3>

              {/* Target Usernames Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">
                    Target Instagram Handles <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-400">
                    Separate multiple handles with commas or newlines
                  </span>
                </div>
                <input
                  type="text"
                  value={targetUsernames}
                  onChange={(e) => setTargetUsernames(e.target.value)}
                  placeholder="@username1, @username2, @target_brand..."
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono"
                />

                {/* Quick Pick from Saved Handles */}
                {savedHandles.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-gray-400 font-medium mr-1">Quick Add:</span>
                    {savedHandles.map((h) => {
                      const clean = h.handle.replace(/^@/, "");
                      const isAdded = targetUsernames.includes(clean);
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => toggleSavedHandle(h.handle)}
                          className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                            isAdded
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                          }`}
                        >
                          @{clean}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Message Content Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">
                    Message Body <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-400">
                    {customMessage.length} characters
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type your message, news bulletin, or updates to send to Instagram users..."
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
                />
              </div>

              {/* Simulated Instagram Chat Bubble Preview */}
              {customMessage.trim() && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <InstagramIcon className="w-3.5 h-3.5 text-gray-500" /> DM Preview
                  </div>
                  <div className="flex items-end justify-end">
                    <div className="max-w-md bg-gray-900 text-white text-xs px-4 py-2.5 rounded-2xl rounded-br-sm shadow-sm whitespace-pre-wrap leading-relaxed">
                      {customMessage}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setCustomMessage("");
                    setSelectedNewsId(null);
                    setTargetUsernames("");
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={handleSendInstagramDMs}
                  disabled={isSendingDm || !activeDeviceId}
                  className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-lg shadow-md transition-all ${
                    isSendingDm || !activeDeviceId
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gray-900 hover:bg-black active:scale-95"
                  }`}
                >
                  <Send className={`w-4 h-4 ${isSendingDm ? "animate-pulse" : ""}`} />
                  {isSendingDm ? "Queuing Tasks..." : "Send Instagram DMs"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: TARGET HANDLES DIRECTORY ── */}
      {activeTab === "handles" && (
        <div className="w-full space-y-6 min-h-[580px]">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-700" /> Add New Target Instagram Handle
            </h3>
            <form onSubmit={handleAddHandle} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Handle</label>
                <input
                  type="text"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  placeholder="@username"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Display Name</label>
                <input
                  type="text"
                  value={newHandleName}
                  onChange={(e) => setNewHandleName(e.target.value)}
                  placeholder="e.g. Daily Press"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                <select
                  value={newHandleCategory}
                  onChange={(e) => setNewHandleCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="General">General</option>
                  <option value="News">News Media</option>
                  <option value="Influencer">Influencer</option>
                  <option value="Community">Community</option>
                  <option value="Government">Government</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Handle
              </button>
            </form>
          </div>

          {/* Directory Table */}
          <div className="w-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Saved Target Directory ({savedHandles.length})
              </span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3">Handle</th>
                  <th className="px-6 py-3">Display Name</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {savedHandles.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                      No saved target handles yet. Add your target Instagram handles above.
                    </td>
                  </tr>
                ) : (
                  savedHandles.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-3 font-mono font-semibold text-gray-900">
                      @{item.handle}
                    </td>
                    <td className="px-6 py-3 text-gray-800 font-medium">{item.name}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleDeleteHandle(item.id)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                        title="Remove handle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: INSTAGRAM TASK QUEUE ── */}
      {activeTab === "queue" && (
        <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-0 min-h-[580px] flex flex-col">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Filter Queue:
              </span>
              {["ALL", "PENDING", "PROCESSING", "COMPLETED", "FAILED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setQueueFilter(status)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    queueFilter === status
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <button
              onClick={fetchTasks}
              disabled={loadingTasks}
              className="text-xs text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTasks ? "animate-spin" : ""}`} /> Refresh Queue
            </button>
          </div>

          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Target Handle</th>
                <th className="px-6 py-3">Device Phone</th>
                <th className="px-6 py-3">Message Preview</th>
                <th className="px-6 py-3 text-right">Queued At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingTasks && tasks.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                    Loading queue tasks...
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="w-10 h-10 text-gray-300 mb-2" />
                      <p className="text-base font-semibold text-gray-700">No Instagram tasks</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Tasks will appear here once you dispatch messages to Instagram handles.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const statusColors = {
                    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
                    PROCESSING: "bg-blue-100 text-blue-800 border-blue-200",
                    COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
                    FAILED: "bg-red-100 text-red-800 border-red-200",
                  };
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
                            statusColors[t.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs font-semibold text-gray-900">
                        @{t.target || t.contact_number}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-600 font-mono">
                        {t.device_phone || t.device_name || "Auto-assigned"}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-700 max-w-sm truncate" title={t.details || t.message}>
                        {t.details || t.message}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-400 text-right whitespace-nowrap">
                        {new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

