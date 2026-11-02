"use client";

import { useState, useEffect, useRef } from "react";

/**
 * EditNewsModal — same Figma style as CreateNewsModal but pre-filled.
 * Cream background, large serif heading, all fields editable.
 */

const CATEGORIES = [
  "Politics", "Sports", "Business", "Technology",
  "Regional", "National", "Entertainment", "Health",
];

const STATUSES = [
  { value: "SCRAPED", label: "Scraped News" },
  { value: "AI_REWRITTEN", label: "AI Rewritten" },
  { value: "WRITER_REVIEW", label: "Writer Review" },
  { value: "EDITOR_VERIFICATION", label: "Send to Editor (Pending Approval)" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "PUBLISHED", label: "Published" },
];

export default function EditNewsModal({ isOpen, article, onClose, onSave }) {
  const [form, setForm] = useState({
    headline: "", subtitle: "", shortDescription: "",
    fullContent: "", category: "Politics", author: "",
    tags: "", publishDate: "", coverPreview: null, status: "Draft",
  });
  const fileRef = useRef(null);

  useEffect(() => {
    if (article) {
      setForm({
        headline:         article.headline        ?? "",
        subtitle:         article.subtitle        ?? "",
        shortDescription: article.shortDescription ?? "",
        fullContent:      article.fullContent      ?? "",
        category:         article.type             ?? "Politics",
        author:           article.author           ?? "",
        tags:             article.tags             ?? "",
        publishDate:      article.publishDate      ?? "",
        coverPreview:     article.coverPreview     ?? null,
        status:           article.status           ?? "Draft",
      });
    }
  }, [article?.id]);

  if (!isOpen || !article) return null;

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleCoverImage = (file) => {
    if (!file) return;
    setForm(p => ({
      ...p,
      coverImage: file,
      coverPreview: URL.createObjectURL(file)
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSave?.({ ...article, ...form, type: form.category });
    onClose?.();
  };

  const inputCls = "w-full bg-white/60 border border-gray-200 rounded px-3 py-2.5 font-body text-[14px] text-brand-black placeholder:text-gray-400 focus:outline-none focus:border-gray-400 transition-colors";
  const labelCls = "block font-label text-[9px] tracking-[0.18em] text-gray-500 uppercase mb-1.5";

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
          maxWidth: "600px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-label text-[10px] tracking-[0.2em] text-brand-red uppercase font-semibold mb-1">
                {article.id} · {article.wordCount} WORDS
              </p>
              <h2 className="font-heading text-3xl font-semibold text-brand-black leading-tight">
                Edit News Article
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-colors mt-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-5 h-px bg-gray-300" />
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="px-8 py-6 flex flex-col gap-5">
          {/* Headline */}
          <div>
            <label className={labelCls}>HEADLINE <span className="text-brand-red">*</span></label>
            <input id="edit-headline" required type="text"
              placeholder="enter the article headline"
              value={form.headline} onChange={(e) => set("headline", e.target.value)}
              className={inputCls} />
          </div>

          {/* Subtitle */}
          <div>
            <label className={labelCls}>SUBTITLE</label>
            <input id="edit-subtitle" type="text"
              placeholder="optional standfirst / dek"
              value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)}
              className={inputCls} />
          </div>

          {/* Short Description */}
          <div>
            <label className={labelCls}>SHORT DESCRIPTION</label>
            <textarea id="edit-short-desc" rows={2}
              placeholder="one or two sentence summary"
              value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)}
              className={`${inputCls} resize-none`} />
          </div>

          {/* Full Content */}
          <div>
            <label className={labelCls}>FULL CONTENT</label>
            <textarea id="edit-full-content" rows={6}
              placeholder="write a full article body..."
              value={form.fullContent} onChange={(e) => set("fullContent", e.target.value)}
              className={`${inputCls} resize-none`} />
          </div>

          {/* Category + Author */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>CATEGORY</label>
              <select id="edit-category" value={form.category}
                onChange={(e) => set("category", e.target.value)} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>AUTHOR</label>
              <input id="edit-author" type="text" placeholder="Author name..."
                value={form.author} onChange={(e) => set("author", e.target.value)}
                className={inputCls} />
            </div>
          </div>

          {/* Tags + Publish Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>TAGS</label>
              <input id="edit-tags" type="text" placeholder="comma, separated, tags"
                value={form.tags} onChange={(e) => set("tags", e.target.value)}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>PUBLISH DATE</label>
              <input id="edit-publish-date" type="text" placeholder="e.g 2 july 2026, 18:00"
                value={form.publishDate} onChange={(e) => set("publishDate", e.target.value)}
                className={inputCls} />
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <label className={labelCls}>COVER IMAGE</label>
            <div className="flex items-center gap-3">
              <div className="w-20 h-16 rounded border border-gray-200 bg-white/60 overflow-hidden flex items-center justify-center flex-shrink-0">
                {form.coverPreview ? (
                  <img src={form.coverPreview} alt="cover" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" id="edit-upload-image-btn"
                  onClick={() => fileRef.current?.click()}
                  className="font-body text-[12px] font-medium px-4 py-2 border border-gray-400 rounded bg-white/60 hover:bg-white text-brand-black transition-colors flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Upload Image
                </button>
                <button type="button" id="edit-ai-generate-btn"
                  className="font-body text-[12px] font-semibold px-4 py-2 rounded bg-brand-red text-white hover:bg-red-700 transition-colors">
                  AI Generate
                </button>
                {form.coverPreview && (
                  <button type="button" id="edit-remove-image-btn"
                    onClick={() => {
                      set("coverPreview", null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="font-body text-[12px] px-4 py-2 border border-gray-300 rounded bg-white/60 hover:bg-white text-gray-600 transition-colors">
                    Remove
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*"
                  style={{ display: "none" }} onChange={(e) => handleCoverImage(e.target.files?.[0])} />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={labelCls}>STATUS</label>
            <select id="edit-status" value={form.status}
              onChange={(e) => set("status", e.target.value)} className={inputCls}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-300">
            <button type="button" id="edit-cancel-btn" onClick={onClose}
              className="font-body text-[13px] font-medium px-6 py-2.5 border border-gray-400 rounded-lg bg-transparent hover:bg-white/50 text-brand-black transition-colors">
              Cancel
            </button>
            <button type="submit" id="edit-save-btn"
              className="font-body text-[13px] font-semibold px-6 py-2.5 rounded-lg bg-brand-red text-white hover:bg-red-700 active:scale-95 transition-all">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
