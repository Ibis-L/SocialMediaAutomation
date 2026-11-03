"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  UploadCloud,
  Film,
  CheckCircle2,
  AlertCircle,
  Play,
  RefreshCw,
  ArrowRight,
  Video
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AddVideoToLibraryPage() {
  const router = useRouter();

  // Form State
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // User Requirement: Keep checked "Yes, made for kids" always by default
  const [isMadeForKids, setIsMadeForKids] = useState(true);
  // User Requirement: Comments on or off (by default on only)
  const [commentsEnabled, setCommentsEnabled] = useState(true);

  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  // Library videos list
  const [videoLibrary, setVideoLibrary] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [previewingVideo, setPreviewingVideo] = useState(null);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch("/api/youtube/videos");
      if (res.ok) {
        const data = await res.json();
        setVideoLibrary(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error("Failed to fetch video library:", err);
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        setSaveErrorMsg("Please select a valid video file (.mp4, .mov, etc.)");
        return;
      }
      setVideoFile(file);
      setSaveErrorMsg("");
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(URL.createObjectURL(file));

      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      setSaveErrorMsg("Please choose a video file first.");
      return;
    }
    if (!title.trim()) {
      setSaveErrorMsg("Video title is required.");
      return;
    }

    setIsSavingVideo(true);
    setSaveErrorMsg("");
    setSaveSuccessMsg("");

    try {
      const formData = new FormData();
      formData.append("video_file", videoFile);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("is_made_for_kids", isMadeForKids ? "true" : "false");
      formData.append("comments_enabled", commentsEnabled ? "true" : "false");

      const res = await fetch("/api/youtube/videos", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.detail || "Failed to save video to library.");
      }

      const created = await res.json();
      setSaveSuccessMsg("Video saved to library successfully!");

      // Reset Form
      setVideoFile(null);
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
      setTitle("");
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      await fetchVideos();
    } catch (err) {
      setSaveErrorMsg(err.message);
    } finally {
      setIsSavingVideo(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* ADD VIDEO FORM */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Film className="w-4 h-4 text-red-600" />
              Add Video to Central Library
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload video footage, configure YouTube audience rules, and persist to database for distribution.
            </p>
          </div>
          <Link
            href="/dashboard/youtube/distribute"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors flex items-center gap-1.5"
          >
            Distribute to Devices <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <form onSubmit={handleSaveVideo} className="p-6">
          {saveSuccessMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
              <Link
                href="/dashboard/youtube/distribute"
                className="text-xs font-semibold text-green-800 underline hover:text-green-950 flex items-center gap-1"
              >
                Proceed to Distribute &rarr;
              </Link>
            </div>
          )}
          {saveErrorMsg && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{saveErrorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Video File Dropzone / Picker */}
            <div className="lg:col-span-5 flex flex-col">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Select Video File *
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 min-h-[220px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-5 cursor-pointer transition-all ${
                  videoFile
                    ? "border-red-400 bg-red-50/30"
                    : "border-gray-300 hover:border-red-400 hover:bg-gray-50/60 bg-gray-50/40"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="video/*"
                  className="hidden"
                />

                {videoPreviewUrl ? (
                  <div className="w-full flex flex-col items-center">
                    <video
                      src={videoPreviewUrl}
                      controls
                      className="max-h-36 w-auto rounded-lg shadow-sm border border-gray-200"
                    />
                    <p className="mt-2 text-xs font-medium text-gray-700 truncate max-w-xs">
                      {videoFile?.name}
                    </p>
                    <span className="text-[11px] text-gray-400 mt-0.5">Click to replace video</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2 shadow-2xs">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">Click to choose video</p>
                    <p className="text-xs text-gray-400 mt-1">MP4, MOV, or MKV up to 500MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Video Details & YouTube Rules */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Video Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Breaking News: Major City Infrastructure Update"
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Video Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write a short summary, hashtags (#News, #Update), and references..."
                  className="w-full text-sm px-3.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
                />
              </div>

              {/* Required Radio Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* 1. Made for Kids (Always checked Yes by default) */}
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                  <span className="block text-xs font-semibold text-gray-900 mb-2">
                    Audience Option *
                  </span>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800">
                      <input
                        type="radio"
                        name="is_made_for_kids"
                        checked={isMadeForKids === true}
                        onChange={() => setIsMadeForKids(true)}
                        className="text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                      <span className="flex items-center gap-1 font-semibold text-red-700">
                        Yes, made for kids <span className="text-[10px] text-gray-400 font-normal">(Default)</span>
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-600">
                      <input
                        type="radio"
                        name="is_made_for_kids"
                        checked={isMadeForKids === false}
                        onChange={() => setIsMadeForKids(false)}
                        className="text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                      <span>No, not made for kids</span>
                    </label>
                  </div>
                </div>

                {/* 2. Comments (Default On) */}
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                  <span className="block text-xs font-semibold text-gray-900 mb-2">
                    Comments Setting *
                  </span>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800">
                      <input
                        type="radio"
                        name="comments_enabled"
                        checked={commentsEnabled === true}
                        onChange={() => setCommentsEnabled(true)}
                        className="text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        Comments On <span className="text-[10px] text-gray-400 font-normal">(Default)</span>
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-600">
                      <input
                        type="radio"
                        name="comments_enabled"
                        checked={commentsEnabled === false}
                        onChange={() => setCommentsEnabled(false)}
                        className="text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                      <span>Comments Off</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingVideo || !videoFile || !title.trim()}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all ${
                    isSavingVideo || !videoFile || !title.trim()
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 active:scale-[0.98]"
                  }`}
                >
                  {isSavingVideo ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Uploading & Saving...
                    </>
                  ) : (
                    <>
                      <Film className="w-4 h-4" />
                      Save to Video Library
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SAVED VIDEOS IN LIBRARY OVERVIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-gray-600" />
              Saved Videos in Library ({videoLibrary.length})
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              All videos stored in database ready for multi-device distribution.
            </p>
          </div>
          <button
            onClick={fetchVideos}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh List
          </button>
        </div>

        <div className="p-6">
          {loadingVideos ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading videos...</div>
          ) : videoLibrary.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              No videos saved yet. Upload your first video using the form above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videoLibrary.map((vid) => (
                <div
                  key={vid.id}
                  className="rounded-xl border border-gray-200 p-4 bg-white hover:border-red-300 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">
                        {vid.title}
                      </h4>
                      {vid.video_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewingVideo(vid)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                          title="Preview Video"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {vid.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                        {vid.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                        {vid.is_made_for_kids ? "Made for Kids" : "Not for Kids"}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                        Comments {vid.comments_enabled ? "On" : "Off"}
                      </span>
                    </div>

                    <Link
                      href={`/dashboard/youtube/distribute?videoId=${vid.id}`}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      Distribute <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
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
