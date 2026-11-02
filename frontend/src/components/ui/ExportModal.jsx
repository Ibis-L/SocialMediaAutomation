"use client";

/**
 * ExportModal — matches Figma design exactly.
 * Large serif heading, cream background, large format cards with red file icons.
 */
export default function ExportModal({ isOpen, onClose, totalItems = 12847 }) {
  if (!isOpen) return null;

  const formats = [
    { id: "xlsx", label: "Excel (.Xlsx)" },
    { id: "csv",  label: "CSV (.Csv)"   },
    { id: "pdf",  label: "PDF (.Pdf)"   },
  ];

  const handleExport = (fmt) => {
    alert(`Exporting as ${fmt.toUpperCase()}...`);
    onClose?.();
  };

  // Red file / document SVG icon matching Figma (small ~24px)
  const FileIcon = () => (
    <svg className="w-6 h-6 text-brand-red flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25h10.5A2.25 2.25 0 0019.5 19.5V7.5L14.25 2.25z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 2.25V7.5h5.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12h7.5M8.25 15.75h5.25" />
    </svg>
  );

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
          maxWidth: "480px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-5">
          <h2 className="font-heading text-3xl font-semibold text-brand-black leading-tight">
            Export News
          </h2>
          <p className="font-body text-[13px] text-gray-500 mt-1">
            Choose A Format For The Current Filtered View.
          </p>
          <div className="mt-5 h-px bg-gray-300" />
        </div>

        {/* Format options */}
        <div className="px-8 pb-8 flex flex-col gap-3">
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              id={`export-${fmt.id}-btn`}
              onClick={() => handleExport(fmt.id)}
              className="flex items-center gap-5 w-full text-left px-5 py-4 rounded-xl border border-gray-200 bg-brand-cream hover:bg-white/80 transition-colors duration-150 group"
              style={{ background: "rgba(255,255,255,0.35)" }}
            >
              <FileIcon />
              <span className="font-body text-[16px] font-medium text-brand-black">
                {fmt.label}
              </span>
            </button>
          ))}

          <button
            id="export-cancel-btn"
            onClick={onClose}
            className="mt-2 font-body text-[13px] font-medium px-6 py-2.5 border border-gray-400 rounded-lg bg-transparent hover:bg-gray-100 text-brand-black transition-colors w-full text-center"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
