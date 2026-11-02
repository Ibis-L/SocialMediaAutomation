"use client";

/**
 * EditorDecisionPanel — Approve, Send Feedback, and Reject action buttons.
 *
 * Props:
 *  - onApprove:      () => void
 *  - onFeedback:     () => void
 *  - onReject:       () => void
 */
export default function EditorDecisionPanel({ onApprove, onFeedback, onReject }) {
  return (
    <div className="bg-white rounded shadow-sm p-5 flex flex-col gap-3">
      <h3 className="font-heading text-base font-semibold text-brand-black">
        Editor Decision
      </h3>

      {/* Approve */}
      <button
        id="approve-btn"
        onClick={onApprove}
        className="flex items-center justify-center gap-2 w-full py-3 rounded bg-status-active text-white font-label text-[10px] tracking-wider hover:opacity-90 active:scale-[0.98] transition-all duration-150"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Approved &amp; Sent To Publishing
      </button>

      {/* Send Feedback + Reject */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <button
          id="send-feedback-btn"
          onClick={onFeedback}
          className="flex items-center justify-center gap-1.5 rounded border border-gray-300 font-label text-[10px] tracking-wider text-brand-black hover:bg-gray-50 transition-colors"
          style={{ minHeight: "36px", padding: "8px 10px" }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Send Feedback</span>
        </button>
        <button
          id="reject-btn"
          onClick={onReject}
          className="flex items-center justify-center gap-1.5 rounded border border-brand-red font-label text-[10px] tracking-wider text-brand-red hover:bg-red-50 transition-colors"
          style={{ minHeight: "36px", padding: "8px 10px" }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Reject</span>
        </button>
      </div>
    </div>
  );
}
