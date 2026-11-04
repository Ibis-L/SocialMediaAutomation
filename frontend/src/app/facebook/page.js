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
  Share2,
  AlertCircle,
  FileText,
  Clock,
  Link as LinkIcon
} from "lucide-react";
import Link from "next/link";
import { getApiBaseUrl } from "@/lib/api";

function FacebookIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export default function FacebookDashboardPage() {
  const [activeTab, setActiveTab] = useState("dm"); // 'dm' | 'handles' | 'queue'

  // Devices & News
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [approvedNews, setApprovedNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [refreshingNews, setRefreshingNews] = useState(false);

  // Message & Dispatch state
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [selectedNewsId, setSelectedNewsId] = useState(null);
  const [customMessage, setCustomMessage] = useState("");
  const [targetLinks, setTargetLinks] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Target Directory state (persisted in browser localStorage)
  const [savedLinks, setSavedLinks] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("facebook_target_links");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedLinks(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const saveLinks = (updated) => {
    setSavedLinks(updated);
    try {
      localStorage.setItem("facebook_target_links", JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkCategory, setNewLinkCategory] = useState("General");

  // Queue state
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [queueFilter, setQueueFilter] = useState("ALL");

  // Fetch Approved News
  const fetchApprovedNews = useCallback(async () => {
    try {
      setRefreshingNews(true);
      const apiBase = getApiBaseUrl();
      const res = await fetch(
        `${apiBase}/masters/api/editor/article/?status=APPROVED`,
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
            (typeof n.content === "object" && n.content?.seo_desc) ||
            "No summary provided.",
          content: typeof n.content === "object" ? n.content?.content : n.content,
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

  // Fetch Connected Devices
  const fetchDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);
      const res = await fetch("/api/devices");
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.results || []);
        setDevices(items);
        if (items.length > 0 && !activeDeviceId) {
          const online = items.find((d) => d.status === "ACTIVE" || d.is_online);
          setActiveDeviceId(online ? online.id : items[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    } finally {
      setLoadingDevices(false);
    }
  }, [activeDeviceId]);

  // Fetch Tasks for Queue
  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.results || []);
        const fbTasks = items.filter(
          (t) => (t.platform || t.task_type || "").toUpperCase() === "FACEBOOK"
        );
        setTasks(fbTasks);
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
  }, [fetchApprovedNews, fetchDevices, fetchTasks]);

  // Periodic poll for queue
  useEffect(() => {
    if (activeTab === "queue") {
      const interval = setInterval(fetchTasks, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchTasks]);

  // When an article is picked, populate message body
  const handleSelectNews = (article) => {
    if (selectedNewsId === article.id) {
      setSelectedNewsId(null);
      setCustomMessage("");
    } else {
      setSelectedNewsId(article.id);
      const formatted = `📰 *${article.headline}*\n\n${article.summary}`;
      setCustomMessage(formatted);
    }
  };

  // Add Link to Directory
  const handleAddLink = (e) => {
    e.preventDefault();
    if (!newLinkUrl.trim()) return;

    let cleanUrl = newLinkUrl.trim();
    const item = {
      id: Date.now(),
      url: cleanUrl,
      name: newLinkName.trim() || cleanUrl,
      category: newLinkCategory || "General",
    };

    const updated = [item, ...savedLinks];
    saveLinks(updated);
    setNewLinkUrl("");
    setNewLinkName("");
  };

  const handleDeleteLink = (id) => {
    const updated = savedLinks.filter((h) => h.id !== id);
    saveLinks(updated);
  };

  const toggleSavedLink = (url) => {
    let current = targetLinks.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (current.includes(url)) {
      current = current.filter((u) => u !== url);
    } else {
      current.push(url);
    }
    setTargetLinks(current.join(", "));
  };

  // Send Facebook Messages
  const handleSendFacebookTasks = async () => {
    if (!activeDeviceId) {
      setFeedbackMessage({ type: "error", text: "Please select an active dispatch device." });
      return;
    }

    const linksList = targetLinks
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((link) => {
        if (link.startsWith("http://") || link.startsWith("https://") || link.startsWith("fb://")) {
          return link;
        }
        if (link.includes("facebook.com") || link.includes("fb.me")) {
          return `https://${link}`;
        }
        return link;
      });

    if (linksList.length === 0) {
      setFeedbackMessage({
        type: "error",
        text: "Please specify at least one target Facebook share link or profile URL.",
      });
      return;
    }

    if (!customMessage.trim()) {
      setFeedbackMessage({
        type: "error",
        text: "Message body cannot be empty.",
      });
      return;
    }

    try {
      setIsSending(true);
      setFeedbackMessage(null);

      const tasksPayload = linksList.map((linkUrl) => ({
        device_id: activeDeviceId,
        contact_number: linkUrl,
        message: customMessage.trim(),
        platform: "facebook",
      }));

      const res = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: tasksPayload }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTargetLinks("");
        setSelectedNewsId(null);
        setFeedbackMessage(null);
        fetchTasks();
        setActiveTab("queue");
      } else {
        setFeedbackMessage({
          type: "error",
          text: data.error || data.message || "Failed to enqueue Facebook tasks.",
        });
      }
    } catch (err) {
      setFeedbackMessage({ type: "error", text: "Network error: " + err.message });
    } finally {
      setIsSending(false);
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
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <FacebookIcon className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Facebook Automation</h1>
              <p className="text-xs text-gray-500">
                Automated direct messaging &amp; news dispatch via Facebook Share Links &amp; Profiles.
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
            <div className="text-lg font-bold text-gray-900">
              {tasks.filter((t) => t.status === "PENDING" || t.status === "PROCESSING").length}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">In Queue</div>
          </div>
          <div className="h-6 w-px bg-gray-200" />
          <div className="text-center px-2.5">
            <div className="text-lg font-bold text-gray-900">
              {tasks.filter((t) => t.status === "COMPLETED").length}
            </div>
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
          <LinkIcon className="w-3.5 h-3.5" /> Target Share Links ({savedLinks.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("queue");
            fetchTasks();
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "queue"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Task Queue ({tasks.length})
        </button>
      </div>

      {/* Error banner only */}
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
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
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
                            <span className="text-blue-600 font-bold text-xs shrink-0">✓</span>
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

          {/* Right Column: Composer & Target Links (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gray-700" /> Compose Facebook Message / Share
              </h3>

              {/* Target Share Links Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">
                    Target Facebook Share Link(s) or Profile URL(s) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-400">
                    Paste links copied from Facebook share button
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={targetLinks}
                  onChange={(e) => setTargetLinks(e.target.value)}
                  placeholder="https://www.facebook.com/share/p/xxxx/, https://www.facebook.com/share/xxxx/, or @username..."
                  className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono resize-y"
                />
                <p className="text-[11px] text-gray-400">
                  Tip: Supports full Facebook share links (e.g. <code className="text-gray-600">https://www.facebook.com/share/...</code>). Separate multiple links with commas or newlines.
                </p>

                {/* Quick Pick from Saved Links */}
                {savedLinks.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-gray-400 font-medium mr-1">Quick Add:</span>
                    {savedLinks.map((item) => {
                      const isAdded = targetLinks.includes(item.url);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleSavedLink(item.url)}
                          className={`px-2 py-0.5 text-xs rounded-full border transition-colors max-w-xs truncate ${
                            isAdded
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                          }`}
                          title={item.url}
                        >
                          {item.name || item.url}
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
                  placeholder="Type your message, news bulletin, or updates to send to Facebook profiles/recipients..."
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
                />
              </div>

              {/* Simulated Chat Bubble Preview */}
              {customMessage.trim() && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FacebookIcon className="w-3.5 h-3.5 text-blue-600" /> Facebook Message Preview
                  </div>
                  <div className="flex items-end justify-end">
                    <div className="max-w-md bg-blue-600 text-white text-xs px-4 py-2.5 rounded-2xl rounded-br-sm shadow-sm whitespace-pre-wrap leading-relaxed">
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
                    setTargetLinks("");
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={handleSendFacebookTasks}
                  disabled={isSending || !activeDeviceId}
                  className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-lg shadow-md transition-all ${
                    isSending || !activeDeviceId
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gray-900 hover:bg-black active:scale-95"
                  }`}
                >
                  <Send className={`w-4 h-4 ${isSending ? "animate-pulse" : ""}`} />
                  {isSending ? "Queuing Tasks..." : "Send Facebook Messages"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: TARGET SHARE LINKS DIRECTORY ── */}
      {activeTab === "handles" && (
        <div className="w-full space-y-6 min-h-[580px]">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-gray-700" /> Add New Target Facebook Share Link
            </h3>
            <form onSubmit={handleAddLink} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Facebook Share Link or Profile URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://www.facebook.com/share/... or https://fb.me/..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Display Label</label>
                <input
                  type="text"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  placeholder="e.g. City Reporter / Official Page"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                <select
                  value={newLinkCategory}
                  onChange={(e) => setNewLinkCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="General">General</option>
                  <option value="News">News Media</option>
                  <option value="Public Figure">Public Figure</option>
                  <option value="Community">Community Group</option>
                  <option value="Official">Official / Govt</option>
                </select>
              </div>
              <div className="md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Save Link to Directory
                </button>
              </div>
            </form>
          </div>

          {/* Directory Table */}
          <div className="w-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Saved Target Directory ({savedLinks.length})
              </span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3">Label</th>
                  <th className="px-6 py-3">Share Link / URL</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {savedLinks.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                      No saved Facebook target links yet. Add your target Facebook share links above.
                    </td>
                  </tr>
                ) : (
                  savedLinks.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-3 font-semibold text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-blue-600 max-w-md truncate" title={item.url}>
                        <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                          {item.url} <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleDeleteLink(item.id)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                          title="Remove link"
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

      {/* ── TAB 3: FACEBOOK TASK QUEUE ── */}
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
                <th className="px-6 py-3">Target Share Link / URL</th>
                <th className="px-6 py-3">Assigned Device</th>
                <th className="px-6 py-3">Message Content</th>
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
                      <p className="text-base font-semibold text-gray-700">No Facebook tasks</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Tasks will appear here once you dispatch messages or news to Facebook share links.
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
                      <td className="px-6 py-3.5 font-mono text-xs font-semibold text-gray-900 max-w-xs truncate" title={t.contact_number || t.target}>
                        {t.contact_number || t.target}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-600 font-mono">
                        {t.device_phone || t.device_number || "Auto-assigned"}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-700 max-w-sm truncate" title={t.message || t.details}>
                        {t.message || t.details}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-400 text-right whitespace-nowrap">
                        {new Date(t.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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

