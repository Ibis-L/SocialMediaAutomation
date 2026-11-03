"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import {
  Film,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Play,
  Check,
  RefreshCw,
  Send,
  Battery,
  BatteryCharging,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function DistributeContent() {
  const searchParams = useSearchParams();
  const initialVideoId = searchParams.get("videoId");

  const [videoLibrary, setVideoLibrary] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState(initialVideoId ? parseInt(initialVideoId, 10) : null);

  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);

  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState("");
  const [dispatchErrorMsg, setDispatchErrorMsg] = useState("");

  const [previewingVideo, setPreviewingVideo] = useState(null);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch("/api/youtube/videos");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setVideoLibrary(list);
        if (list.length > 0 && !selectedVideoId) {
          if (initialVideoId) {
            const found = list.find((v) => v.id.toString() === initialVideoId.toString());
            if (found) setSelectedVideoId(found.id);
            else setSelectedVideoId(list[0].id);
          } else {
            setSelectedVideoId(list[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch video library:", err);
    } finally {
      setLoadingVideos(false);
    }
  }, [selectedVideoId, initialVideoId]);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/devices");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setDevices(list);
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
    fetchDevices();
  }, [fetchVideos, fetchDevices]);

  const toggleDevice = (deviceId) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId]
    );
  };

  const selectAllDevices = () => {
    if (selectedDeviceIds.length === devices.length) {
      setSelectedDeviceIds([]);
    } else {
      setSelectedDeviceIds(devices.map((d) => d.id));
    }
  };

  const handleDispatchUpload = async () => {
    if (!selectedVideoId) {
      setDispatchErrorMsg("Please select a video from the library.");
      return;
    }
    if (selectedDeviceIds.length === 0) {
      setDispatchErrorMsg("Please select at least one target device.");
      return;
    }

    setIsDispatching(true);
    setDispatchErrorMsg("");
    setDispatchSuccessMsg("");

    const videoObj = videoLibrary.find((v) => v.id === selectedVideoId);

    try {
      const res = await fetch("/api/youtube/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: selectedVideoId,
          device_ids: selectedDeviceIds,
          title: videoObj?.title || "Video Update",
          description: videoObj?.description || "",
          is_made_for_kids: videoObj?.is_made_for_kids ?? true,
          comments_enabled: videoObj?.comments_enabled ?? true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to queue YouTube upload tasks.");
      }

      setDispatchSuccessMsg(
        `Successfully queued YouTube upload to ${selectedDeviceIds.length} device(s)!`
      );
      setSelectedDeviceIds([]);
    } catch (err) {
      setDispatchErrorMsg(err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  const selectedVideoObj = videoLibrary.find((v) => v.id === selectedVideoId);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/70 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              Distribute Videos to Connected Devices
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Select a video from your central library, choose destination phone(s), and trigger upload automation.
            </p>
          </div>
          <Link
            href="/dashboard/youtube"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Add Video
          </Link>
        </div>

        <div className="p-6">
          {dispatchSuccessMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-green-50 border border-green-200 text-green-900 text-sm flex flex-wrap gap-2 items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <span>{dispatchSuccessMsg}</span>
              </div>
              <Link
                href="/dashboard/queue"
                className="text-xs font-semibold underline text-green-800 hover:text-green-950"
              >
                View in Unified Queue &rarr;
              </Link>
            </div>
          )}

          {dispatchErrorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-900 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{dispatchErrorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sub-column 1: Video Library Selection (6 cols) */}
            <div className="lg:col-span-6 flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-gray-50/30">
              <div className="px-4 py-3 bg-gray-100/70 border-b border-gray-200 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-red-600" />
                  1. Select Saved Video ({videoLibrary.length})
                </span>
                <button
                  type="button"
                  onClick={fetchVideos}
                  className="text-gray-500 hover:text-gray-800 text-xs flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              <div className="p-3 overflow-y-auto max-h-[420px] space-y-2.5">
                {loadingVideos ? (
                  <div className="py-16 text-center text-xs text-gray-400">Loading saved videos...</div>
                ) : videoLibrary.length === 0 ? (
                  <div className="py-16 text-center text-xs text-gray-400">
                    No videos found. Upload a video in the{" "}
                    <Link href="/dashboard/youtube" className="underline font-semibold text-red-600">
                      Add Video tab
                    </Link>{" "}
                    first.
                  </div>
                ) : (
                  videoLibrary.map((vid) => {
                    const isSelected = selectedVideoId === vid.id;
                    return (
                      <div
                        key={vid.id}
                        onClick={() => setSelectedVideoId(vid.id)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex gap-3 items-start ${
                          isSelected
                            ? "bg-red-50/60 border-red-300 ring-1 ring-red-400/30 shadow-2xs"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-red-600 border-red-600 text-white"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {vid.title}
                          </h4>
                          {vid.description && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                              {vid.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                              {vid.is_made_for_kids ? "Made for Kids" : "Not for Kids"}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                              Comments {vid.comments_enabled ? "On" : "Off"}
                            </span>
                            <span>{new Date(vid.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {vid.video_url && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewingVideo(vid);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-white"
                            title="Preview Video"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sub-column 2: Target Devices Selection (6 cols) */}
            <div className="lg:col-span-6 flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-gray-50/30">
              <div className="px-4 py-3 bg-gray-100/70 border-b border-gray-200 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  2. Select Target Devices ({selectedDeviceIds.length}/{devices.length})
                </span>
                <button
                  type="button"
                  onClick={selectAllDevices}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  {selectedDeviceIds.length === devices.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="p-3 overflow-y-auto max-h-[420px] space-y-2.5">
                {loadingDevices ? (
                  <div className="py-16 text-center text-xs text-gray-400">Loading registered devices...</div>
                ) : devices.length === 0 ? (
                  <div className="py-16 text-center text-xs text-gray-400">
                    No devices registered. Scan QR code in{" "}
                    <Link href="/dashboard/manage-devices" className="underline font-semibold text-blue-600">
                      Manage Devices
                    </Link>.
                  </div>
                ) : (
                  devices.map((device) => {
                    const isSelected = selectedDeviceIds.includes(device.id);
                    const isOnline =
                      device.last_heartbeat &&
                      new Date() - new Date(device.last_heartbeat) < 90000;

                    return (
                      <div
                        key={device.id}
                        onClick={() => toggleDevice(device.id)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex gap-3 items-center justify-between ${
                          isSelected
                            ? "bg-blue-50/60 border-blue-300 ring-1 ring-blue-400/30 shadow-2xs"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent onClick
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {device.name || "Android Automation Phone"}
                              </span>
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isOnline ? "bg-green-500" : "bg-gray-300"
                                }`}
                                title={isOnline ? "Online" : "Offline"}
                              />
                            </div>
                            <span className="text-xs text-gray-500 font-mono">
                              {device.phone_number}
                            </span>
                          </div>
                        </div>

                        {/* Battery & Health Indicator */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                          {device.battery_level !== null && (
                            <div className="flex items-center gap-1">
                              {device.battery_status === "Charging" ? (
                                <BatteryCharging className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <Battery className="w-3.5 h-3.5 text-gray-500" />
                              )}
                              <span>{device.battery_level}%</span>
                            </div>
                          )}
                          {device.temperature && (
                            <span className="text-gray-400">· {device.temperature.toFixed(0)}°C</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Distribution Action Bar */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-4 items-center justify-between">
            <div className="text-xs text-gray-500">
              {selectedVideoObj ? (
                <span>
                  Ready to dispatch: <strong className="text-gray-900">{selectedVideoObj.title}</strong> to{" "}
                  <strong className="text-blue-600">{selectedDeviceIds.length}</strong> device(s)
                </span>
              ) : (
                <span>Select a video from the library to proceed</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleDispatchUpload}
              disabled={isDispatching || !selectedVideoId || selectedDeviceIds.length === 0}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all ${
                isDispatching || !selectedVideoId || selectedDeviceIds.length === 0
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
              }`}
            >
              {isDispatching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Queueing Task...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Queue Upload to {selectedDeviceIds.length} Device{selectedDeviceIds.length === 1 ? "" : "s"}
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Video Preview Modal */}
      {previewingVideo && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {previewingVideo.title}
              </h3>
              <button
                onClick={() => setPreviewingVideo(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>
            <div className="bg-black flex items-center justify-center">
              <video
                src={previewingVideo.video_url}
                controls
                autoPlay
                className="max-h-[380px] w-auto"
              />
            </div>
            <div className="p-4 bg-gray-50 text-xs text-gray-500">
              {previewingVideo.description || "No description provided"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function YouTubeDistributePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Loading distribution matrix...</div>}>
      <DistributeContent />
    </Suspense>
  );
}
