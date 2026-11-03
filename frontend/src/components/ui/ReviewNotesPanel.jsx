"use client";

import { useState } from "react";

/**
 * ReviewNotesPanel — quick-tag chips, reviewer comments, and add-note input.
 *
 * Props:
 *  - notes:  { id, author, initials, color, time, text }[]
 */

const QUICK_TAGS = [
  "+ Rewrite Headline",
  "+ Add Image",
  "+ Verify Facts",
  "+ Trim Length",
];

export default function ReviewNotesPanel({ articleId, notes = [], onNoteAdded }) {
  const [draft, setDraft] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    const trimmed = draft.trim();
    if (!trimmed || !articleId) return;
    
    setIsPosting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/masters/api/editor/article/${articleId}/add_note/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        },
        body: JSON.stringify({ note: trimmed })
      });
      if (res.ok) {
        const newNote = await res.json();
        if (onNoteAdded) onNoteAdded(newNote);
        setDraft("");
      } else {
        alert("Failed to post note.");
      }
    } catch (e) {
      console.error(e);
      alert("Error posting note.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleQuickTag = (tag) => {
    setDraft((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  return (
    <div className="bg-white rounded shadow-sm p-5 flex flex-col gap-4">
      <h3 className="font-heading text-base font-semibold text-brand-black">
        Review Notes
      </h3>

      {/* Quick-tag chips */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_TAGS.map((tag) => (
          <button
            key={tag}
            id={`quick-tag-${tag.replace(/\s+/g, "-").toLowerCase()}`}
            onClick={() => handleQuickTag(tag)}
            className="font-label text-[9px] tracking-wide px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-brand-red hover:text-brand-red transition-colors duration-150"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Comments list */}
      <div className="flex flex-col gap-3 max-h-48 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="flex gap-3">
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-brand-blue`}
              >
                <span className="font-label text-[8px] font-bold text-white">
                  {(note.author_name || "??").substring(0, 2).toUpperCase()}
                </span>
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-label text-[10px] font-semibold text-brand-black">
                    {note.author_name}
                  </span>
                  <span className="font-label text-[9px] text-gray-400">
                    {new Date(note.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="font-body text-[11px] text-gray-600 leading-relaxed">
                  {note.note}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add note input */}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <input
          id="review-note-input"
          type="text"
          placeholder="Add a review note..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePost()}
          className="flex-1 border border-gray-200 rounded px-3 py-2 font-body text-[12px] text-brand-black placeholder:text-gray-400 focus:outline-none focus:border-brand-blue transition-colors bg-gray-50"
        />
        <button
          id="post-note-btn"
          onClick={handlePost}
          className="font-label text-[10px] tracking-wider px-4 py-2 rounded bg-brand-red text-white hover:bg-red-700 active:scale-95 transition-all"
        >
          Post
        </button>
      </div>
    </div>
  );
}
