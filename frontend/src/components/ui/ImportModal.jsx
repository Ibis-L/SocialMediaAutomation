"use client";

import { useState, useRef } from "react";

/**
 * ImportModal — matches Figma design exactly.
 * Cream background, large serif heading, file zone on cream card,
 * # column in validation table, large footer buttons.
 */
const statusConfig = {
  valid:     { dot: "bg-status-active",  text: "text-status-active" },
  duplicate: { dot: "bg-brand-blue",     text: "text-brand-blue"    },
  error:     { dot: "bg-brand-red",      text: "text-brand-red"     },
};

export default function ImportModal({ isOpen, onClose, onImport, previewData = [] }) {
  const [fileName, setFileName] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);

  if (!isOpen) return null;

  const validCount = previewData.filter((r) => r.status === "valid").length;
  const errorCount = previewData.filter((r) => r.status !== "valid").length;

  const handleFile = (file) => { if (file) setFileName(file.name); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };
  const handleImport = () => {
    onImport?.(previewData.filter((r) => r.status === "valid"));
    onClose?.();
  };

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0,
        width: "100vw", height: "100vh",
        zIndex: 9999, backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px", boxSizing: "border-box",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        style={{
          background: "#ede9df",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "580px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <h2 className="font-heading text-3xl font-semibold text-brand-black leading-tight">
            Import News
          </h2>
          <p className="font-body text-[12px] text-gray-500 mt-1">
            Upload Excel, CSV, docs or TXT rows and Validated below before import
          </p>
          <div className="mt-4 h-px bg-gray-300" />
        </div>

        <div className="px-8 pb-8">
          {/* File dropzone — cream card */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex items-center justify-between rounded-lg px-5 py-4 mb-6 transition-colors ${
              isDragging ? "bg-blue-50 border-2 border-brand-blue" : "bg-white/60 border border-gray-200"
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Upload icon */}
              <div className="w-10 h-10 flex items-center justify-center">
                <svg className="w-7 h-7 text-brand-black" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <p className="font-body text-[15px] font-semibold text-brand-black">
                  {fileName ?? "News_batch_july.Xlsx"}
                </p>
                {previewData.length > 0 && (
                  <p className="font-label text-[11px] text-gray-500 tracking-wide mt-0.5">
                    {previewData.length} Rows Detected ·{validCount} Valid ·{errorCount} Errors
                  </p>
                )}
              </div>
            </div>
            <button
              id="choose-file-btn"
              onClick={() => fileRef.current?.click()}
              className="font-body text-[13px] font-medium px-5 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-brand-black transition-colors"
            >
              Choose File
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.csv,.doc,.docx,.txt"
              style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>

          {/* Preview & Validation */}
          {previewData.length > 0 && (
            <div>
              <p className="font-label text-[10px] tracking-[0.2em] text-gray-400 uppercase mb-3">
                Preview &amp; Validation
              </p>
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white/50">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-white/70">
                      <th className="font-label text-[9px] tracking-[0.15em] text-gray-400 text-left px-4 py-2.5 font-medium w-8">#</th>
                      <th className="font-label text-[9px] tracking-[0.15em] text-gray-400 text-left px-3 py-2.5 font-medium">TITLE</th>
                      <th className="font-label text-[9px] tracking-[0.15em] text-gray-400 text-left px-3 py-2.5 font-medium">CATEGORY</th>
                      <th className="font-label text-[9px] tracking-[0.15em] text-gray-400 text-right px-4 py-2.5 font-medium">VALIDATION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => {
                      const cfg = statusConfig[row.status] ?? statusConfig.valid;
                      return (
                        <tr key={i} className={`border-b border-gray-100 ${i === previewData.length - 1 ? "border-b-0" : ""}`}>
                          <td className="px-4 py-3">
                            <span className={`w-2.5 h-2.5 rounded-full inline-block ${cfg.dot}`} />
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-body text-[13px] text-brand-black">{row.title}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-body text-[13px] text-gray-500">{row.category}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-label text-[11px] font-medium ${cfg.text}`}>{row.validation}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 mt-7">
            <button
              id="import-cancel-btn"
              onClick={onClose}
              className="font-body text-[13px] font-medium px-6 py-2.5 border border-gray-400 rounded-lg bg-transparent hover:bg-gray-100 text-brand-black transition-colors"
            >
              Cancel
            </button>
            <button
              id="import-submit-btn"
              onClick={handleImport}
              className="font-body text-[13px] font-semibold px-6 py-2.5 rounded-lg bg-brand-red text-white hover:bg-red-700 active:scale-95 transition-all"
            >
              Import &amp; Valid Rows
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
