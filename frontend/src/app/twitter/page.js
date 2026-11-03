"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Send,
  CheckCircle2,
  Users,
  RefreshCw,
  QrCode,
  X,
  Smartphone,
  Plus,
  Trash2,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Share2,
  Heart,
  Repeat,
  Bookmark,
  ShieldCheck,
  AlertCircle,
  Layers,
  FileText
} from "lucide-react";
import Link from "next/link";

export default function TwitterDashboardPage() {
  // Navigation tabs within Twitter Panel
  const [activeTab, setActiveTab] = useState("dm"); // 'dm' | 'tweet' | 'handles' | 'queue'

  // Devices & News
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [approvedNews, setApprovedNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [refreshingNews, setRefreshingNews] = useState(false);

  // DM Selection state
  const [selectedNewsIds, setSelectedNewsIds] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [targets, setTargets] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [selectedHandleIds, setSelectedHandleIds] = useState([]);
  const [isSendingDm, setIsSendingDm] = useState(false);
  const [dmSuccessMessage, setDmSuccessMessage] = useState("");

  // Custom Tweet Composer state
  const [tweetDevice, setTweetDevice] = useState(null);
  const [tweetText, setTweetText] = useState("");
  const [isPostingTweet, setIsPostingTweet] = useState(false);
  const [tweetSuccessMessage, setTweetSuccessMessage] = useState("");

  // Target Handles Management state
  const [newHandle, setNewHandle] = useState("");
  const [newHandleName, setNewHandleName] = useState("");
  const [newHandleCategory, setNewHandleCategory] = useState("General");
  const [bulkHandlesText, setBulkHandlesText] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isSavingTarget, setIsSavingTarget] = useState(false);

  // Live Queue & History
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Fetch approved news
  const fetchApprovedNews = useCallback(async (isManual = false) => {
    if (isManual) setRefreshingNews(true);
    try {
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
              ? n.edited_content.substring(0, 140) + "..."
              : typeof n.content === "string"
              ? n.content.substring(0, 140) + "..."
              : n.content?.body_content
              ? n.content.body_content.substring(0, 140) + "..."
              : "No summary available."),
          url: n.source_url,
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

  // Fetch devices
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
        if (list.length > 0 && !tweetDevice) {
          setTweetDevice(list[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    } finally {
      setLoadingDevices(false);
    }
  }, [activeDeviceId, tweetDevice]);

  // Fetch targets (Twitter handles)
  const fetchTargets = useCallback(async () => {
    try {
      const res = await fetch("/api/twitter/targets", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.results || []);
        setTargets(list);
      }
    } catch (err) {
      console.error("Failed to fetch Twitter targets:", err);
    } finally {
      setLoadingTargets(false);
    }
  }, []);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch("/api/twitter/tasks", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.results || []);
        setTasks(list);
      }
    } catch (err) {
      console.error("Failed to fetch Twitter tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovedNews();
    fetchDevices();
    fetchTargets();
    fetchTasks();

    const interval = setInterval(() => {
      fetchApprovedNews();
      fetchTasks();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchApprovedNews, fetchDevices, fetchTargets, fetchTasks]);

  // News selection toggle
  const handleNewsToggle = (id) => {
    setSelectedNewsIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Handle selection toggle
  const handleTargetToggle = (targetId) => {
    setSelectedHandleIds((prev) =>
      prev.includes(targetId) ? prev.filter((i) => i !== targetId) : [...prev, targetId]
    );
  };

  const handleSelectAllTargets = () => {
    if (selectedHandleIds.length === targets.length) {
      setSelectedHandleIds([]);
    } else {
      setSelectedHandleIds(targets.map((t) => t.id));
    }
  };

  // Dispatch News DMs
  const handleSendDms = async () => {
    if (selectedNewsIds.length === 0 || selectedHandleIds.length === 0 || !activeDeviceId) {
      alert("Please select at least one news item, one connected device, and one target Twitter handle.");
      return;
    }

    setIsSendingDm(true);
    setDmSuccessMessage("");

    // Build News Payload
    const messageParts = ["📰 Breaking News Updates"];
    selectedNewsIds.forEach((id) => {
      const news = approvedNews.find((n) => n.id === id);
      if (news) {
        messageParts.push("", news.headline);
        if (news.summary) messageParts.push(news.summary);
        if (news.url) messageParts.push(`Read more: ${news.url}`);
      }
    });
    const content = messageParts.join("\n");

    const selectedTargetObjects = targets.filter((t) => selectedHandleIds.includes(t.id));
    const tasksPayload = selectedTargetObjects.map((target) => ({
      device_id: activeDeviceId,
      target_handle: target.handle,
      content,
    }));

    try {
      const res = await fetch("/api/twitter/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: tasksPayload }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDmSuccessMessage(`Successfully queued ${data.queued} Twitter DM task(s)! The companion app will attempt to DM and auto-follow if DMs are closed.`);
        setSelectedHandleIds([]);
        fetchTasks();
        setTimeout(() => setDmSuccessMessage(""), 5000);
      } else {
        alert("Failed to queue tasks: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error sending DMs:", err);
      alert("Error queueing DMs. Please check backend connection.");
    } finally {
      setIsSendingDm(false);
    }
  };

  // Post Custom Tweet
  const handlePostTweet = async () => {
    if (!tweetText.trim()) {
      alert("Please write your Tweet before publishing.");
      return;
    }
    if (!tweetDevice) {
      alert("Please select a device/account to publish this Tweet from.");
      return;
    }

    setIsPostingTweet(true);
    setTweetSuccessMessage("");

    try {
      const res = await fetch("/api/twitter/compose-tweet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: tweetDevice,
          content: tweetText.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTweetSuccessMessage("Tweet successfully queued for selected device! Android companion app will open Twitter and publish it.");
        setTweetText("");
        fetchTasks();
        setTimeout(() => setTweetSuccessMessage(""), 5000);
      } else {
        alert("Failed to queue Tweet: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error posting Tweet:", err);
      alert("Error posting Tweet. Please check backend connection.");
    } finally {
      setIsPostingTweet(false);
    }
  };

  // Add Single Target Handle
  const handleAddTarget = async (e) => {
    e.preventDefault();
    if (!newHandle.trim()) return;

    setIsSavingTarget(true);
    try {
      const cleanHandle = newHandle.trim().startsWith("@") ? newHandle.trim() : `@${newHandle.trim()}`;
      const res = await fetch("/api/twitter/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: cleanHandle,
          name: newHandleName.trim() || cleanHandle,
          category: newHandleCategory || "General",
          device: activeDeviceId,
        }),
      });
      if (res.ok) {
        setNewHandle("");
        setNewHandleName("");
        fetchTargets();
      } else {
        const data = await res.json();
        alert("Failed to add target: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error adding target:", err);
    } finally {
      setIsSavingTarget(false);
    }
  };

  // Bulk Import Handles
  const handleBulkImport = async () => {
    if (!bulkHandlesText.trim()) return;

    try {
      const res = await fetch("/api/twitter/targets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handles: bulkHandlesText,
          category: newHandleCategory || "Imported",
          device_id: activeDeviceId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Successfully imported ${data.imported} Twitter handles!`);
        setBulkHandlesText("");
        setShowBulkModal(false);
        fetchTargets();
      } else {
        alert("Failed to import: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error bulk importing:", err);
    }
  };

  // Delete Target Handle
  const handleDeleteTarget = async (id, handle) => {
    if (!confirm(`Remove target ${handle}?`)) return;
    try {
      const res = await fetch(`/api/twitter/targets?id=${id}`, { method: "DELETE" });
      fetchTargets();
    } catch (err) {
      console.error("Error deleting target:", err);
    }
  };

  const activeDeviceObj = devices.find((d) => d.id === activeDeviceId);
  const tweetDeviceObj = devices.find((d) => d.id === tweetDevice);

  // Character counter calculation
  const charLimit = 280;
  const remainingChars = charLimit - tweetText.length;
  const isOverLimit = remainingChars < 0;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* Top Banner / Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white shadow-md">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Twitter (X) Automation</h1>
              <p className="text-xs text-gray-500">
                Automated News Direct Messages (with smart Follow fallback) &amp; Custom Tweet Publishing.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab("dm")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "dm"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            News DM Distribution
          </button>
          <button
            onClick={() => setActiveTab("tweet")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "tweet"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Custom Tweet Composer
          </button>
          <button
            onClick={() => setActiveTab("handles")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "handles"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Manage Handles ({targets.length})
          </button>
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "queue"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Task Queue &amp; Logs
          </button>
        </div>
      </div>

      {/* Success Notification Banners */}
      {dmSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 animate-fade-in shadow-sm">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span>{dmSuccessMessage}</span>
        </div>
      )}
      {tweetSuccessMessage && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm flex items-center gap-3 animate-fade-in shadow-sm">
          <CheckCircle2 size={20} className="text-blue-600 shrink-0" />
          <span>{tweetSuccessMessage}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: NEWS DM DISTRIBUTION (Structured like WhatsApp Panel) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "dm" && (
        <div className="flex flex-col gap-6">
          {/* Smart Fallback Info Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-md flex items-center justify-between border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  Smart Automated Fallback Mechanism Active
                </h4>
                <p className="text-xs text-slate-300">
                  The Android companion app attempts to DM the news payload. If user privacy settings block incoming DMs, it automatically clicks <strong>Follow</strong> on their Twitter profile.
                </p>
              </div>
            </div>
            <button
              onClick={handleSendDms}
              disabled={isSendingDm || selectedNewsIds.length === 0 || selectedHandleIds.length === 0}
              className={`px-5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 transition-all shadow-md ${
                selectedNewsIds.length === 0 || selectedHandleIds.length === 0
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white active:scale-95"
              }`}
            >
              {isSendingDm ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Queueing DMs...
                </>
              ) : (
                <>
                  <Send size={14} /> Send News to {selectedHandleIds.length} Handle(s)
                </>
              )}
            </button>
          </div>

          {/* 3-Column Layout: Column 1 = Select News | Column 2 = Select Device | Column 3 = Select Twitter Handles */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start h-[700px]">
            {/* Column 1: Select News */}
            <div className="flex flex-col gap-4 h-full bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  Select News Article(s)
                </h2>
                <button
                  onClick={() => fetchApprovedNews(true)}
                  disabled={loadingNews || refreshingNews}
                  title="Refresh news"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <RefreshCw size={14} className={refreshingNews ? "animate-spin text-blue-600" : ""} />
                </button>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                {loadingNews ? (
                  <p className="text-sm text-gray-400 text-center py-10">Loading approved news...</p>
                ) : approvedNews.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">No approved editorial articles available.</p>
                ) : (
                  approvedNews.map((news) => {
                    const isSelected = selectedNewsIds.includes(news.id);
                    return (
                      <div
                        key={news.id}
                        onClick={() => handleNewsToggle(news.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-gray-900 leading-snug">{news.headline}</h4>
                          {isSelected && <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />}
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-2">{news.summary}</p>
                        {news.url && (
                          <span className="text-[10px] text-blue-500 font-mono truncate">{news.url}</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 2: Select Device / Twitter Account */}
            <div className="flex flex-col gap-4 h-full bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-hidden">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                Select Sending Phone / Account
              </h2>

              <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                {loadingDevices ? (
                  <p className="text-sm text-gray-400 text-center py-10">Loading connected companion phones...</p>
                ) : devices.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center gap-3">
                    <Smartphone size={36} className="text-gray-300" />
                    <p className="text-sm font-medium text-gray-700">No phones registered</p>
                    <p className="text-xs text-gray-400 max-w-xs">
                      Pair an Android companion phone from the WhatsApp tab or device manager.
                    </p>
                    <Link
                      href="/dashboard/manage-devices"
                      className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Pair Device via QR Code &rarr;
                    </Link>
                  </div>
                ) : (
                  devices.map((device) => {
                    const isSelected = activeDeviceId === device.id;
                    return (
                      <div
                        key={device.id}
                        onClick={() => setActiveDeviceId(device.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            <Smartphone size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {device.name || "Android Phone"}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">{device.phone_number}</p>
                          </div>
                          {isSelected && <CheckCircle2 size={18} className="text-blue-600 shrink-0" />}
                        </div>

                        {/* Twitter Account on Device */}
                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                          <span className="text-gray-500 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 fill-current text-gray-400" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            Twitter:
                          </span>
                          <span className="font-semibold text-gray-800">
                            {device.twitter_handle || "@Logged_In_User"}
                          </span>
                        </div>

                        {/* Battery & Health */}
                        {device.battery_level !== undefined && device.battery_level !== null && (
                          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                            <span>Battery: {device.battery_level}%</span>
                            <span>{device.battery_status || "Active"}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 3: Select Target Twitter Handles */}
            <div className="flex flex-col gap-4 h-full bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  Select Target Handles
                </h2>
                {targets.length > 0 && (
                  <button
                    onClick={handleSelectAllTargets}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    {selectedHandleIds.length === targets.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>

              {/* Quick Add Handle Mini Form */}
              <form onSubmit={handleAddTarget} className="flex gap-2">
                <input
                  type="text"
                  placeholder="@handle or username"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={isSavingTarget || !newHandle.trim()}
                  className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-medium rounded-lg disabled:opacity-50 shrink-0"
                >
                  <Plus size={14} />
                </button>
              </form>

              <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                {loadingTargets ? (
                  <p className="text-sm text-gray-400 text-center py-10">Loading handles...</p>
                ) : targets.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center gap-2">
                    <Users size={32} className="text-gray-300" />
                    <p className="text-xs font-medium text-gray-700">No Twitter handles added yet</p>
                    <p className="text-[11px] text-gray-400 max-w-xs">
                      Type an @handle above or switch to &quot;Manage Handles&quot; to bulk import a list.
                    </p>
                  </div>
                ) : (
                  targets.map((target) => {
                    const isSelected = selectedHandleIds.includes(target.id);
                    return (
                      <div
                        key={target.id}
                        onClick={() => handleTargetToggle(target.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                          isSelected ? "border-blue-500 bg-blue-50/40" : "border-gray-100 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                              isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"
                            }`}
                          >
                            {isSelected && <CheckCircle2 size={13} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 font-mono">{target.handle}</p>
                            <p className="text-[11px] text-gray-500">{target.name || "Target User"}</p>
                          </div>
                        </div>
                        {target.category && (
                          <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {target.category}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: CUSTOM TWEET COMPOSER (Requirement 3)                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "tweet" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Composition Form & Device Selector */}
          <div className="lg:col-span-7 flex flex-col gap-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Compose Custom Tweet</h2>
                <p className="text-xs text-gray-500">
                  Write any custom post and assign it to a connected phone to publish automatically.
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                280 Character Mode
              </span>
            </div>

            {/* 1. Device / Account Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone size={14} className="text-blue-600" />
                Select Publishing Phone / Account
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {devices.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200 col-span-2">
                    No phones connected. Please ensure the Android companion app is running and paired.
                  </p>
                ) : (
                  devices.map((dev) => {
                    const isSelected = tweetDevice === dev.id;
                    return (
                      <div
                        key={dev.id}
                        onClick={() => setTweetDevice(dev.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            <Smartphone size={16} />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-gray-900 truncate">{dev.name || "Companion Phone"}</p>
                            <p className="text-[11px] text-gray-500 font-mono">
                              {dev.twitter_handle || dev.phone_number}
                            </p>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="text-blue-600 shrink-0 ml-2" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. Tweet Text Area */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tweet Content
                </label>
                <span
                  className={`text-xs font-mono font-bold ${
                    isOverLimit ? "text-red-600" : remainingChars <= 20 ? "text-amber-500" : "text-gray-400"
                  }`}
                >
                  {remainingChars} chars remaining
                </span>
              </div>
              <textarea
                rows={6}
                value={tweetText}
                onChange={(e) => setTweetText(e.target.value)}
                placeholder="What is happening?! Type breaking news, commentary, announcements, or hashtags..."
                className={`w-full p-4 rounded-xl border text-sm leading-relaxed focus:outline-none transition-all ${
                  isOverLimit
                    ? "border-red-400 focus:border-red-500 bg-red-50/20"
                    : "border-gray-200 focus:border-blue-500 bg-white shadow-inner"
                }`}
              />
            </div>

            {/* Quick Hashtags & Breaking News Snippet Insert */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-gray-400">Quick insert:</span>
              {["#BreakingNews", "#Technology", "#India", "#SSLocal", "#Update"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTweetText((prev) => `${prev} ${tag}`.trim())}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-[11px] font-medium transition"
                >
                  {tag}
                </button>
              ))}
              {approvedNews.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const top = approvedNews[0];
                    setTweetText(`🚨 BREAKING: ${top.headline}\n\n${top.url || ""}`);
                  }}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-[11px] font-medium transition flex items-center gap-1"
                >
                  <Sparkles size={12} /> Latest Headline
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setTweetText("")}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium"
              >
                Clear Text
              </button>
              <button
                type="button"
                onClick={handlePostTweet}
                disabled={isPostingTweet || !tweetText.trim() || isOverLimit || !tweetDevice}
                className={`px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
                  !tweetText.trim() || isOverLimit || !tweetDevice
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-black hover:bg-zinc-800 text-white active:scale-95"
                }`}
              >
                {isPostingTweet ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Queueing Tweet...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Publish Tweet from Device
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Live Twitter / X Preview */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              Live Tweet Preview
            </h3>
            {/* Mocked Twitter Card */}
            <div className="bg-black text-white p-5 rounded-2xl border border-zinc-800 shadow-xl font-sans">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                  {tweetDeviceObj?.name ? tweetDeviceObj.name.charAt(0) : "X"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                    <span className="font-bold text-sm text-white truncate">
                      {tweetDeviceObj?.name || "Official SS Local News"}
                    </span>
                    <span className="text-blue-400">
                      <svg className="w-4 h-4 fill-current inline" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </span>
                    <span className="text-xs text-zinc-500 truncate">
                      {tweetDeviceObj?.twitter_handle || "@SSLocalOfficial"}
                    </span>
                    <span className="text-zinc-600 text-xs">·</span>
                    <span className="text-zinc-500 text-xs">now</span>
                  </div>

                  {/* Tweet Text Content */}
                  <div className="mt-2 text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed break-words">
                    {tweetText.trim() ? (
                      tweetText
                    ) : (
                      <span className="text-zinc-600 italic">
                        Your custom tweet preview will appear here in real-time...
                      </span>
                    )}
                  </div>

                  {/* Mocked Interaction Metrics */}
                  <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between text-zinc-500 text-xs">
                    <button type="button" className="flex items-center gap-1.5 hover:text-blue-400 transition">
                      <MessageCircle size={14} /> <span>0</span>
                    </button>
                    <button type="button" className="flex items-center gap-1.5 hover:text-emerald-400 transition">
                      <Repeat size={14} /> <span>0</span>
                    </button>
                    <button type="button" className="flex items-center gap-1.5 hover:text-rose-400 transition">
                      <Heart size={14} /> <span>0</span>
                    </button>
                    <button type="button" className="flex items-center gap-1.5 hover:text-blue-400 transition">
                      <Bookmark size={14} />
                    </button>
                    <button type="button" className="flex items-center gap-1.5 hover:text-blue-400 transition">
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Instruction helper */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 flex flex-col gap-1.5">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <Smartphone size={14} className="text-blue-600" /> Companion App Process:
              </span>
              <p>
                1. Once queued, the selected Android phone companion app receives this task on its next polling pulse.
              </p>
              <p>
                2. It launches Twitter with this exact post pre-filled into the composer, auto-clicks &quot;Post&quot;, and reports back completion status.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: MANAGE TARGET HANDLES (IDs)                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "handles" && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Manage Twitter (X) Handles</h2>
              <p className="text-xs text-gray-500">
                Maintain directory of target influencers, media channels, and reader accounts to receive news payloads.
              </p>
            </div>
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <FileText size={14} /> Bulk Paste Handles
            </button>
          </div>

          {/* Add Handle Form */}
          <form
            onSubmit={handleAddTarget}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm"
          >
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-700">Twitter Handle / ID</label>
              <input
                type="text"
                placeholder="@elonmusk or techinsider"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-700">Contact / Organization Name</label>
              <input
                type="text"
                placeholder="e.g. Tech Insider"
                value={newHandleName}
                onChange={(e) => setNewHandleName(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-700">Category Tag</label>
              <select
                value={newHandleCategory}
                onChange={(e) => setNewHandleCategory(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="General">General</option>
                <option value="Media / Journalist">Media / Journalist</option>
                <option value="Government / Official">Government / Official</option>
                <option value="Influencer">Influencer</option>
                <option value="Tech">Tech</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSavingTarget || !newHandle.trim()}
                className="w-full py-2 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <Plus size={14} /> Add Target
              </button>
            </div>
          </form>

          {/* Handles Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Configured Target Handles ({targets.length})</h3>
              <button
                onClick={fetchTargets}
                className="p-1 text-gray-400 hover:text-blue-600 transition"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {loadingTargets ? (
              <p className="p-8 text-center text-xs text-gray-400">Loading targets...</p>
            ) : targets.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-400">No Twitter handles configured yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Handle</th>
                      <th className="py-3 px-4">Display Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Added Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {targets.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-gray-900">{t.handle}</td>
                        <td className="py-3 px-4 text-gray-600">{t.name || "—"}</td>
                        <td className="py-3 px-4">
                          <span className="bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded-full text-[10px]">
                            {t.category || "General"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteTarget(t.id, t.handle)}
                            className="text-gray-400 hover:text-red-600 transition p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bulk Import Modal */}
          {showBulkModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full flex flex-col gap-4 border border-gray-100">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h3 className="text-base font-bold text-gray-900">Bulk Import Twitter Handles</h3>
                  <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-700">
                    <X size={18} />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Paste a list of Twitter IDs or @handles separated by commas, spaces, or newlines.
                </p>
                <textarea
                  rows={6}
                  value={bulkHandlesText}
                  onChange={(e) => setBulkHandlesText(e.target.value)}
                  placeholder="@elonmusk&#10;@reuters&#10;@bloomberg&#10;@techinsider"
                  className="w-full p-3 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkImport}
                    disabled={!bulkHandlesText.trim()}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                  >
                    Import Handles
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 4: LIVE TASK QUEUE & LOGS (Shows Fallback Tracking)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "queue" && (
        <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Twitter Task Queue &amp; Automation History</h2>
              <p className="text-xs text-gray-500">
                Track pending dispatches, completed DMs, automatic follow fallbacks, and posted Tweets.
              </p>
            </div>
            <button
              onClick={fetchTasks}
              disabled={loadingTasks}
              className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition"
            >
              <RefreshCw size={13} className={loadingTasks ? "animate-spin" : ""} /> Refresh Status
            </button>
          </div>

          {loadingTasks ? (
            <p className="text-center py-12 text-xs text-gray-400">Loading queue items...</p>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-2">
              <Layers size={36} className="text-gray-300" />
              <p className="text-sm font-medium text-gray-600">No tasks in history</p>
              <p className="text-xs text-gray-400">Dispatch a DM or compose a tweet to view queue execution logs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Task ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Target / Channel</th>
                    <th className="py-3 px-4">Device</th>
                    <th className="py-3 px-4">Status &amp; Fallback Log</th>
                    <th className="py-3 px-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tasks.map((task) => {
                    let badgeClass = "bg-gray-100 text-gray-700";
                    let badgeText = task.status;

                    if (task.status === "COMPLETED") {
                      badgeClass = "bg-emerald-100 text-emerald-800 border border-emerald-200";
                      badgeText = task.task_type === "TWEET" ? "Tweet Published" : "DM Delivered";
                    } else if (task.status === "FOLLOWED_FALLBACK") {
                      badgeClass = "bg-indigo-100 text-indigo-900 border border-indigo-200";
                      badgeText = "Fallback: Followed User (DM Closed)";
                    } else if (task.status === "PROCESSING") {
                      badgeClass = "bg-blue-100 text-blue-800 animate-pulse";
                      badgeText = "In Progress";
                    } else if (task.status === "PENDING") {
                      badgeClass = "bg-amber-100 text-amber-800";
                      badgeText = "Pending Queue";
                    } else if (task.status === "FAILED") {
                      badgeClass = "bg-rose-100 text-rose-800";
                      badgeText = "Failed";
                    }

                    return (
                      <tr key={task.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-gray-500">#{task.id}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                              task.task_type === "TWEET"
                                ? "bg-black text-white"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {task.task_type === "TWEET" ? "Tweet Post" : "News DM"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                          {task.task_type === "TWEET" ? "Public Feed" : task.target_handle || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 font-medium">
                          {task.device_name || task.device_phone || `Device #${task.device}`}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${badgeClass}`}>
                              {badgeText}
                            </span>
                            {task.result_message && (
                              <span className="text-[10px] text-gray-500 italic max-w-sm truncate">
                                {task.result_message}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-400">
                          {task.created_at ? new Date(task.created_at).toLocaleTimeString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
