"use client";

import { useState } from "react";

/**
 * AIRewriteControls — mode selector, creativity slider, and re-run button.
 *
 * Props:
 *  - defaultMode:       string  e.g. "Humanized"
 *  - defaultCreativity: number  e.g. 60
 *  - onRerun:           (mode, creativity) => void
 */

const MODES = ["Basic", "Humanized", "SEO", "Regional"];

export default function AIRewriteControls({
  defaultMode = "Humanized",
  defaultCreativity = 60,
  onRerun,
}) {
  const [mode, setMode] = useState(defaultMode);
  const [creativity, setCreativity] = useState(defaultCreativity);
  const [loading, setLoading] = useState(false);

  const handleRerun = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onRerun?.(mode, creativity);
    }, 1500);
  };

  return (
    <div className="bg-white rounded shadow-sm p-5 flex flex-col gap-4">
      <h3 className="font-heading text-base font-semibold text-brand-black">
        AI Rewrite Controls
      </h3>

      {/* Mode selector */}
      <div>
        <p className="font-label text-[8px] tracking-[0.18em] text-gray-400 uppercase mb-2">
          Mode
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {MODES.map((m) => (
            <button
              key={m}
              id={`rewrite-mode-${m.toLowerCase()}`}
              onClick={() => setMode(m)}
              className={`font-label text-[10px] tracking-wide px-3 py-1.5 rounded transition-colors duration-150 ${
                mode === m
                  ? "bg-brand-red text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Creativity slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-label text-[8px] tracking-[0.18em] text-gray-400 uppercase">
            Creativity
          </p>
          <span className="font-label text-[10px] text-brand-black font-semibold">
            {creativity}%
          </span>
        </div>
        <input
          id="creativity-slider"
          type="range"
          min={0}
          max={100}
          value={creativity}
          onChange={(e) => setCreativity(Number(e.target.value))}
          className="w-full h-1.5 accent-brand-red cursor-pointer"
        />
      </div>

      {/* Re-Run button */}
      <button
        id="rerun-ai-btn"
        onClick={handleRerun}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-2.5 border border-gray-300 rounded font-label text-[10px] tracking-wider text-brand-black hover:bg-gray-50 transition-colors disabled:opacity-60"
      >
        {loading ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
        {loading ? "Running AI Rewrite..." : "Re-Run AI Rewrite"}
      </button>
    </div>
  );
}
