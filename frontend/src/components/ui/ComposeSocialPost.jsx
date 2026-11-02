"use client";

import { useState } from "react";

/**
 * ComposeSocialPost — compose form for social media posts.
 *
 * Props:
 *  - selectedNews: { id, headline, status, category }
 *  - caption:      string (default caption text)
 *  - hashtags:     string[]
 */

const MEDIA_TYPES = ["Image", "Carousel", "Reel / Video", "Link Card"];
const PUBLISH_PLATFORMS = [
  { id: "facebook",  label: "Facebook",    color: "#1877F2" },
  { id: "instagram", label: "Instagram",   color: "#C910B5" },
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
    facebook: true, instagram: true, twitter: true, linkedin: true,
    telegram: false, youtube: false,
  });

  const togglePlatform = (id) =>
    setSelectedPlatforms((prev) => ({ ...prev, [id]: !prev[id] }));

  const activeCount = Object.values(selectedPlatforms).filter(Boolean).length;

  return (
    <div className="bg-brand-card border border-brand-border rounded flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-border">
        <h2 className="font-heading text-[20px] font-semibold text-brand-black capitalize tracking-[0.03em] leading-[18px]">
          Compose social Post
        </h2>
      </div>

      <div className="px-5 py-4 flex flex-col gap-6">
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
                  {selectedNews?.id} · {selectedNews?.status} · {selectedNews?.category}
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
            Publish To.
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
            className="py-3 rounded bg-brand-red text-white font-inter text-[12px] font-semibold flex items-center justify-center hover:bg-red-700 active:scale-[0.98] transition-all"
          >
            Publish to {activeCount} Platforms
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
