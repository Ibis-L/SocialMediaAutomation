"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Clock, RefreshCw, XCircle, MessageSquare, Film, Share2 } from "lucide-react";

function FacebookIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export default function MessageQueuePage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL"); // ALL, WHATSAPP, YOUTUBE

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle2 className="text-status-active w-4 h-4" />;
      case "PENDING": return <Clock className="text-brand-gold w-4 h-4" />;
      case "PROCESSING":
      case "DOWNLOADING": return <RefreshCw className="text-brand-blue w-4 h-4 animate-spin" />;
      case "FAILED": return <XCircle className="text-brand-red w-4 h-4" />;
      default: return <Clock className="text-gray-400 w-4 h-4" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "COMPLETED": return "bg-green-100 text-green-800 border-green-200";
      case "PENDING": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "PROCESSING":
      case "DOWNLOADING": return "bg-blue-100 text-blue-800 border-blue-200";
      case "FAILED": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterType === "ALL") return true;
    return (t.task_type || "WHATSAPP").toUpperCase() === filterType;
  });

  const pendingCount = tasks.filter((t) => t.status === "PENDING").length;
  const processingCount = tasks.filter((t) => t.status === "PROCESSING" || t.status === "DOWNLOADING").length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap gap-4 justify-between items-center bg-gray-50/70">
        <div>
          <h2 className="text-lg font-semibold text-brand-black">Unified Task Queue</h2>
          <p className="text-xs text-gray-500 mt-0.5">Real-time status for WhatsApp and YouTube dispatch across your device farm.</p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-brand-gold"></span> Pending: <span className="font-bold text-gray-900">{pendingCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-brand-blue"></span> Active: <span className="font-bold text-gray-900">{processingCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-status-active"></span> Done: <span className="font-bold text-gray-900">{completedCount}</span>
          </div>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="px-6 py-2.5 bg-white border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterType === "ALL" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            All Channels ({tasks.length})
          </button>
          <button
            onClick={() => setFilterType("WHATSAPP")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterType === "WHATSAPP" ? "bg-emerald-600 text-white" : "text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> WhatsApp ({tasks.filter(t => (t.task_type || "WHATSAPP") === "WHATSAPP").length})
          </button>
          <button
            onClick={() => setFilterType("INSTAGRAM")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterType === "INSTAGRAM" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" /> Instagram ({tasks.filter(t => (t.platform || t.task_type || "").toUpperCase() === "INSTAGRAM").length})
          </button>
          <button
            onClick={() => setFilterType("FACEBOOK")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterType === "FACEBOOK" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-blue-700 hover:bg-blue-50"
            }`}
          >
            <FacebookIcon className="w-3.5 h-3.5" /> Facebook ({tasks.filter(t => (t.platform || t.task_type || "").toUpperCase() === "FACEBOOK").length})
          </button>
          <button
            onClick={() => setFilterType("FACEBOOK")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterType === "FACEBOOK" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-blue-700 hover:bg-blue-50"
            }`}
          >
            <FacebookIcon className="w-3.5 h-3.5" /> Facebook ({tasks.filter(t => (t.platform || t.task_type || "").toUpperCase() === "FACEBOOK").length})
          </button>
          <button
            onClick={() => setFilterType("YOUTUBE")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterType === "YOUTUBE" ? "bg-red-600 text-white" : "text-gray-500 hover:text-red-700 hover:bg-red-50"
            }`}
          >
            <Film className="w-3.5 h-3.5" /> YouTube ({tasks.filter(t => t.task_type === "YOUTUBE").length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/70 text-gray-500 font-medium border-b border-gray-100 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Channel</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Target / Item</th>
              <th className="px-6 py-3">Assigned Device</th>
              <th className="px-6 py-3">Content Preview</th>
              <th className="px-6 py-3 text-right">Queued At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && tasks.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center text-gray-400">Loading task queue...</td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-14 text-center text-gray-400">
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="w-10 h-10 mb-2 text-gray-300" />
                    <p className="text-base font-medium text-gray-600">Queue is clear</p>
                    <p className="text-xs text-gray-400 mt-1">No tasks matching the selected filter are pending.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => {
                const isYouTube = task.task_type === "YOUTUBE";
                const targetText = task.target || task.contact_number || "—";
                const detailsText = task.details || task.message || "—";
                const devicePhone = task.device_phone || task.device_number || "Auto-assigned";
                const deviceLabel = task.device_name ? `${task.device_name} (${devicePhone})` : devicePhone;

                return (
                  <tr key={task.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      {isYouTube ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-red-50 text-red-700 border border-red-200">
                          <Film className="w-3.5 h-3.5" /> YouTube
                        </span>
                      ) : ((task.platform || task.task_type || "").toUpperCase() === "INSTAGRAM") ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-gray-100 text-gray-800 border border-gray-300">
                          <Share2 className="w-3.5 h-3.5" /> Instagram
                        </span>
                      ) : ((task.platform || task.task_type || "").toUpperCase() === "FACEBOOK") ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          <FacebookIcon className="w-3.5 h-3.5" /> Facebook
                        </span>
                      ) : ((task.platform || task.task_type || "").toUpperCase() === "FACEBOOK") ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          <FacebookIcon className="w-3.5 h-3.5" /> Facebook
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(task.status)}
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-gray-900 max-w-[200px] truncate" title={targetText}>
                      {targetText}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 font-mono text-xs">
                      {deviceLabel}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 max-w-sm truncate" title={detailsText}>
                      {detailsText}
                    </td>
                    <td className="px-6 py-3.5 text-gray-400 text-xs text-right whitespace-nowrap">
                      {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
