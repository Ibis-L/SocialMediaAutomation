"use client";

import { useState } from "react";

/**
 * ComposeSocialPost — compose form for social media posts.
 *
 * Props:
 *  - selectedNews: { id, headline, status, category, source_url }
 *  - caption:      string (default caption text)
 *  - hashtags:     string[]
 */

const MEDIA_TYPES = ["Image", "Carousel", "Reel / Video", "Link Card"];
const PUBLISH_PLATFORMS = [
  { id: "whatsapp",  label: "WhatsApp",    color: "#25D366" },
  { id: "instagram", label: "Instagram",   color: "#C910B5" },
  { id: "facebook",  label: "Facebook",    color: "#1877F2" },
  { id: "twitter",   label: "X (Twitter)", color: "#000000" },
  { id: "linkedin",  label: "LinkedIn",    color: "#0A66C2" },
  { id: "telegram",  label: "Telegram",    color: "#229ED9" },
  { id: "youtube",   label: "YouTube",     color: "#FF0000" },
];

export default function ComposeSocialPost({
  selectedNews,
  caption = "",
  hashtags = [],
}) {
  const [mediaType, setMediaType] = useState("Image");
  const [captionText, setCaptionText] = useState(caption);
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    whatsapp: true,
    instagram: true,
    facebook: false,
    twitter: false,
    linkedin: false,
    telegram: false,
    youtube: false,
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState(null);

  const togglePlatform = (id) =>
    setSelectedPlatforms((prev) => ({ ...prev, [id]: !prev[id] }));

  const activeCount = Object.values(selectedPlatforms).filter(Boolean).length;

  const handleSubmit = async () => {
    const activePlatforms = Object.keys(selectedPlatforms).filter((k) => selectedPlatforms[k]);
    if (activePlatforms.length === 0) {
      alert("Please select at least one platform to publish.");
      return;
    }

    setIsPublishing(true);
    setPublishStatus(null);

    // Prepare full message
    let fullMessage = captionText || selectedNews?.headline || "News Update";
    if (hashtags && hashtags.length > 0) {
      fullMessage += `\n\n${hashtags.join(" ")}`;
    }
    if (selectedNews?.source_url) {
      fullMessage += `\n\nRead more: ${selectedNews.source_url}`;
    }

    try {
      // 1. Fetch available connected devices
      let targetDevices = [];
      try {
        const devRes = await fetch("/api/devices", { cache: "no-store" });
        if (devRes.ok) {
          const devData = await devRes.json();
          targetDevices = Array.isArray(devData) ? devData : (devData.results || []);
        }
      } catch (e) {
        console.warn("Could not fetch devices:", e);
      }

      // 2. Build tasks per selected platform
      const tasks = [];
      for (const platform of activePlatforms) {
        if (targetDevices.length > 0) {
          targetDevices.forEach((dev) => {
            const contacts = dev.contacts && dev.contacts.length > 0
              ? dev.contacts.map((c) => c.phone_number)
              : [dev.phone_number];

            contacts.forEach((contactNumber) => {
              tasks.push({
                device_id: dev.id,
                contact_number: contactNumber,
                message: fullMessage,
                platform: platform,
              });
            });
          });
        } else {
          // If no devices registered yet, still queue task for first device ID or placeholder
          tasks.push({
            device_id: 1,
            contact_number: "Default",
            message: fullMessage,
            platform: platform,
          });
        }
      }

      // 3. Send tasks to the enqueue endpoint
      const res = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });

      const data = await res.json();
      if (res.ok || data.success) {
        setPublishStatus({
          type: "success",
          message: `Queued ${tasks.length} task(s) for ${activePlatforms.join(", ")}!`,
        });
        setTimeout(() => setPublishStatus(null), 4000);
      } else {
        setPublishStatus({
          type: "error",
          message: data.error || data.message || "Failed to queue tasks.",
        });
      }
    } catch (err) {
      console.error("Publishing error:", err);
      setPublishStatus({
        type: "error",
        message: "Failed to connect to backend queue service.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="bg-brand-card border border-brand-border rounded flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-border">
        <h2 className="font-heading text-[20px] font-semibold text-brand-black capitalize tracking-[0.03em] leading-[18px]">
          Compose social Post
        </h2>
      </div>

      <div className="px-5 py-4 flex flex-col gap-6">
        {/* Status Notification */}
        {publishStatus && (
          <div
            className={`p-3 rounded text-xs font-inter border ${
              publishStatus.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {publishStatus.message}
          </div>
        )}

        {/* Selected News */}
        <div>
          <p className="font-label text-[10px] tracking-[0.03em] text-[#727272] uppercase mb-2">
            Selected News
          </p>
          <div className="flex items-center justify-between border border-brand-border rounded p-3">
            <div className="flex items-center gap-3">
              <div className="w-[47px] h-[47px] rounded bg-brand-red flex-shrink-0" />
              <div>
                <p className="font-heading text-[14px] font-semibold text-brand-black capitalize leading-[15px] mb-1">
                  {selectedNews?.headline || "Punjab cabinet clears ₹2,400 cr infrastructure package"}
                </p>
                <p className="font-label text-[10px] text-[#727272] capitalize">
                  {selectedNews?.id || "N-101"} · {selectedNews?.status || "APPROVED"} · {selectedNews?.category || "NEWS"}
                </p>
              </div>
            </div>
            <button className="font-label text-[10px] tracking-[0.03em] text-brand-red uppercase hover:underline">
              CHANGE
            </button>
          </div>
        </div>

        {/* Caption */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-label text-[10px] tracking-[0.03em] text-brand-muted uppercase">
              Caption · Editable
            </p>
            <button className="font-label text-[10px] tracking-[0.03em] text-brand-red uppercase hover:underline">
              ↻ AI Regenerate
            </button>
          </div>
          <textarea
            id="social-caption"
            rows={3}
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
            className="w-full bg-brand-track text-brand-black font-inter text-[10px] leading-[18px] tracking-[0.03em] rounded px-4 py-3 resize-none focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>

        {/* Media Type */}
        <div>
          <p className="font-label text-[10px] tracking-[0.03em] text-brand-muted uppercase mb-2">
            Media Type
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {MEDIA_TYPES.map((m) => (
              <button
                key={m}
                onClick={() => setMediaType(m)}
                className={`font-inter text-[10px] capitalize px-3 py-1.5 rounded transition-colors duration-150 ${
                  mediaType === m
                    ? "bg-brand-red text-white font-semibold"
                    : "bg-white border border-brand-muted text-brand-black font-normal hover:bg-gray-50"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* AI Hashtags */}
        <div>
          <p className="font-label text-[10px] tracking-[0.03em] text-brand-muted uppercase mb-2">
            AI Hashtags
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="font-label text-[10px] text-brand-blue capitalize bg-[#ECECEC] border border-brand-border px-3 py-1.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Publish To */}
        <div>
          <p className="font-label text-[10px] tracking-[0.03em] text-brand-muted uppercase mb-2">
            Publish To
          </p>
          <div className="flex gap-2 flex-wrap">
            {PUBLISH_PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className="flex items-center gap-1.5 font-inter text-[10px] px-4 py-1.5 rounded-full transition-colors duration-150"
                style={{
                  backgroundColor: "#F4F0E7",
                  borderColor: selectedPlatforms[p.id] ? p.color : "rgba(0,0,0,0.2)",
                  borderWidth: "0.5px",
                  color: selectedPlatforms[p.id] ? "#000" : "#727272",
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: selectedPlatforms[p.id] ? p.color : "#d1d5db" }}
                />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", marginTop: "12px" }}>
          <button
            id="publish-btn"
            onClick={handleSubmit}
            disabled={isPublishing || activeCount === 0}
            className="py-3 rounded bg-brand-red text-white font-inter text-[12px] font-semibold flex items-center justify-center hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isPublishing ? "Publishing..." : `Publish to ${activeCount} Platform${activeCount !== 1 ? "s" : ""}`}
          </button>
          <button
            id="schedule-social-btn"
            className="py-3 px-6 rounded border border-black font-inter text-[12px] font-semibold text-black hover:bg-black/5 transition-colors"
          >
            Schedule..
          </button>
        </div>
      </div>
    </div>
  );
}
