"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Clock, RefreshCw, XCircle } from "lucide-react";

export default function MessageQueuePage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

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
      case "COMPLETED": return <CheckCircle2 className="text-status-active w-5 h-5" />;
      case "PENDING": return <Clock className="text-brand-gold w-5 h-5" />;
      case "PROCESSING": return <RefreshCw className="text-brand-blue w-5 h-5 animate-spin" />;
      case "FAILED": return <XCircle className="text-brand-red w-5 h-5" />;
      default: return <Clock className="text-gray-400 w-5 h-5" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "COMPLETED": return "bg-green-100 text-green-800";
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "PROCESSING": return "bg-blue-100 text-blue-800";
      case "FAILED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-lg font-semibold text-brand-black">Live Message Queue</h2>
          <p className="text-sm text-gray-500 mt-1">Watch messages being dispatched to devices in real-time.</p>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <div className="flex items-center gap-1.5 text-gray-600">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-gold"></div> Pending: {tasks.filter(t => t.status === 'PENDING').length}
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-blue"></div> Processing: {tasks.filter(t => t.status === 'PROCESSING').length}
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <div className="w-2.5 h-2.5 rounded-full bg-status-active"></div> Completed: {tasks.filter(t => t.status === 'COMPLETED').length}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Target Contact</th>
              <th className="px-6 py-3 font-medium">Device Phone</th>
              <th className="px-6 py-3 font-medium">Message Preview</th>
              <th className="px-6 py-3 font-medium">Queued At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && tasks.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-400">Loading queue...</td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="w-10 h-10 mb-3 text-gray-300" />
                    <p className="text-base font-medium text-gray-600">Queue is empty</p>
                    <p className="text-sm">No messages are currently pending or processing.</p>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadge(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{task.contact_number}</td>
                  <td className="px-6 py-4 text-gray-500">{task.device_number || "Auto-assigned"}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-md truncate">
                    {task.message.substring(0, 60)}{task.message.length > 60 ? "..." : ""}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(task.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
