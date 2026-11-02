"use client";

import { useState } from "react";

/**
 * ComposeDistribution — the compose panel for WhatsApp distribution.
 * Selected news, template chips, message preview, media attachment, targets, send controls.
 *
 * Props:
 *  - selectedNews: { id, headline, status, category }
 *  - targets:      { id, name, members, checked }[]
 */

const TEMPLATES = ["Breaking News", "Daily Digest", "Headline Only"];
const MEDIA_TYPES = ["Cover Image", "PDF", "Video", "Text Only"];

export default function ComposeDistribution({ selectedNews, targets = [] }) {
  const [template, setTemplate]   = useState("Breaking News");
  const [mediaType, setMediaType] = useState("Cover Image");
  const [checkedTargets, setCheckedTargets] = useState(
    targets.reduce((acc, t) => ({ ...acc, [t.id]: t.checked }), {})
  );
  const [sendRate] = useState(47);

  const toggleTarget = (id) =>
    setCheckedTargets((prev) => ({ ...prev, [id]: !prev[id] }));

  const totalReach = targets
    .filter((t) => checkedTargets[t.id])
    .reduce((sum, t) => sum + t.members, 0);

  return (
    <div className="bg-white rounded shadow-sm flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-heading text-base font-semibold text-brand-black">
          Compose Distribution
        </h2>
      </div>

      <div className="px-5 py-4 flex flex-col gap-5">
        {/* Selected News */}
        <div>
          <p className="font-label text-[8px] tracking-[0.18em] text-gray-400 uppercase mb-2">
            Selected News
          </p>
          <div className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-brand-red flex-shrink-0" />
              <div>
                <p className="font-body text-[12px] font-medium text-brand-black leading-snug">
                  {selectedNews?.headline}
                </p>
                <p className="font-label text-[9px] text-gray-400 mt-0.5">
                  {selectedNews?.id} · {selectedNews?.status} · {selectedNews?.category}
                </p>
              </div>
            </div>
            <button className="font-label text-[10px] tracking-wide text-status-active font-semibold hover:underline">
              CHANGE
            </button>
          </div>
        </div>

        {/* Message Template */}
        <div>
          <p className="font-label text-[8px] tracking-[0.18em] text-gray-400 uppercase mb-2">
            Message Template
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {TEMPLATES.map((t) => (
              <button
                key={t}
                onClick={() => setTemplate(t)}
                className={`font-label text-[10px] tracking-wide px-3 py-1.5 rounded transition-colors duration-150 ${
                  template === t
                    ? "bg-brand-red text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Message preview */}
        <div className="flex items-start gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-red mt-1 flex-shrink-0" />
          <div className="font-body text-[12px] text-gray-600 leading-relaxed">
            <strong>BREAKING*</strong> — Punjab cabinet clears ₹2,400 cr infrastructure package.
            Roads, bridges &amp; water-supply projects across districts; work begins within weeks. a
            <p className="mt-2 text-gray-500">
              Read more → sslocal.in/n/8841
            </p>
          </div>
        </div>

        {/* Media Attachment */}
        <div>
          <p className="font-label text-[8px] tracking-[0.18em] text-gray-400 uppercase mb-2">
            Media Attachment
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {MEDIA_TYPES.map((m) => (
              <button
                key={m}
                onClick={() => setMediaType(m)}
                className={`font-label text-[10px] tracking-wide px-3 py-1.5 rounded transition-colors duration-150 ${
                  mediaType === m
                    ? "bg-brand-red text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Targets */}
        <div>
          <p className="font-label text-[8px] tracking-[0.18em] text-gray-400 uppercase mb-2">
            Targets
          </p>
          <div className="flex flex-col gap-2">
            {targets.map((t) => (
              <label
                key={t.id}
                className="flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={!!checkedTargets[t.id]}
                    onChange={() => toggleTarget(t.id)}
                    className="w-4 h-4 rounded border-gray-300 accent-brand-red"
                  />
                  <span className="font-body text-[12px] text-brand-black group-hover:text-brand-red transition-colors">
                    {t.name}
                  </span>
                </div>
                <span className="font-label text-[10px] text-gray-400">
                  {t.members.toLocaleString()}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Send Rate */}
        <div className="flex items-center justify-between">
          <span className="font-label text-[9px] tracking-[0.15em] text-gray-400 uppercase">
            Send Rate · Anti-Ban
          </span>
          <span className="font-label text-[10px] font-semibold text-status-active">
            {sendRate} Msg/S
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden -mt-2">
          <div
            className="h-full bg-brand-red rounded-full"
            style={{ width: `${(sendRate / 100) * 100}%` }}
          />
        </div>

        {/* Estimated Reach */}
        <div className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
          <div>
            <p className="font-body text-[13px] font-medium text-brand-black">Estimated Reach</p>
            <p className="font-label text-[9px] text-gray-400">~6 Min To Deliver</p>
          </div>
          <span className="font-heading text-2xl font-semibold text-status-active">
            {totalReach.toLocaleString()}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <button
            id="send-now-btn"
            className="py-3 rounded bg-status-active text-white font-label text-[10px] tracking-wider hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Send Now
          </button>
          <button
            id="schedule-btn"
            className="py-3 rounded border border-gray-300 font-label text-[10px] tracking-wider text-brand-black hover:bg-gray-50 transition-colors"
          >
            Schedule..
          </button>
        </div>
      </div>
    </div>
  );
}
