"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

import ApprovalQueue from "@/components/ui/ApprovalQueue";
import ArticleComparison from "@/components/ui/ArticleComparison";
import SeoMetaPanel from "@/components/ui/SeoMetaPanel";
import AIAnalysisPanel from "@/components/ui/AIAnalysisPanel";
import AIRewriteControls from "@/components/ui/AIRewriteControls";
import EditorDecisionPanel from "@/components/ui/EditorDecisionPanel";
import ReviewNotesPanel from "@/components/ui/ReviewNotesPanel";



export default function EditorialApprovalPage() {
  const [rawArticles, setRawArticles] = useState([]);
  const [activeId, setActiveId]       = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/masters/api/editor/article/?status=EDITOR_VERIFICATION`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        setRawArticles(data);
        if (data.length > 0) setActiveId(data[0].id);
      })
      .catch(err => console.error("Failed to fetch queue:", err));
  }, []);

  const activeRawArticle = rawArticles.find(a => a.id === activeId);

  useEffect(() => {
    if (activeRawArticle?.cover_image) {
      setCoverPreview(activeRawArticle.cover_image);
    } else {
      setCoverPreview(null);
    }
  }, [activeRawArticle]);

  const queue = rawArticles.map(a => ({
    id: a.id,
    category: "NEWS",
    categoryDot: "bg-brand-red",
    headline: a.title || "No Title",
    author: a.template_name || "Unknown",
    time: new Date(a.scraped_at).toLocaleDateString(),
  }));

  const article = activeRawArticle ? {
    id: activeRawArticle.id,
    source: activeRawArticle.template_name || "Unknown",
    time: new Date(activeRawArticle.scraped_at).toLocaleDateString(),
    category: "NEWS",
    headline: activeRawArticle.title || "No Title",
    original: activeRawArticle.content ? JSON.stringify(activeRawArticle.content, null, 2) : "No original content.",
    rewritten: activeRawArticle.edited_content || "No rewritten content.",
    seoTitle: activeRawArticle.seo_title || "",
    metaDesc: activeRawArticle.seo_desc || "",
    keywords: activeRawArticle.seo_keywords || "",
    sentiment: activeRawArticle.sentiment || "Neutral",
    readability: activeRawArticle.readability || 0,
    seoScore: activeRawArticle.seo_score || 0,
    reviewNotes: activeRawArticle.review_notes || [],
  } : null;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!activeId || !article || !activeRawArticle) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/masters/api/editor/article/${activeId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "APPROVED",
          edited_content: activeRawArticle.edited_content
        })
      });
      
      if (!res.ok) {
        throw new Error("Failed to update status in backend.");
      }
      
      alert(`✅ "${article.headline}" approved and sent to publishing!`);
      const remaining = rawArticles.filter(a => a.id !== activeId);
      setRawArticles(remaining);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    } catch (e) {
      alert("Error approving article: " + e.message);
    }
  };

  const handleFeedback = () => alert("📩 Feedback panel coming soon.");
  const handleReject   = async () => {
    if (!activeId || !article) return;
    if (window.confirm(`Reject "${article.headline}"?`)) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/masters/api/editor/article/${activeId}/`, {
          method: "DELETE"
        });
        const remaining = rawArticles.filter(a => a.id !== activeId);
        setRawArticles(remaining);
        setActiveId(remaining.length > 0 ? remaining[0].id : null);
      } catch (e) {
        alert("Error rejecting article.");
      }
    }
  };

  const handleRerun = async (mode, creativity) => {
    if (!activeId) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/masters/api/editor/article/${activeId}/ai_rewrite/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: mode.toLowerCase() })
      });
      const data = await res.json();
      if (res.ok) {
        setRawArticles(prev => prev.map(a => 
          a.id === activeId ? { 
            ...a, 
            edited_content: data.edited_content,
            seo_title: data.metadata?.seo_title || a.seo_title,
            seo_desc: data.metadata?.seo_desc || a.seo_desc,
            seo_keywords: data.metadata?.seo_keywords || a.seo_keywords,
            sentiment: data.metadata?.sentiment || "Neutral",
            readability: data.metadata?.readability || 0,
            seo_score: data.metadata?.seo_score || 0
          } : a
        ));
      } else {
        alert("Rewrite failed: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error connecting to AI service.");
    }
  };

  const handleCoverFile = async (file) => {
    if (file) {
      setCoverPreview(URL.createObjectURL(file));
      
      const formData = new FormData();
      formData.append("cover_image", file);
      
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/masters/api/editor/article/${activeId}/`, {
          method: "PATCH",
          body: formData
        });
        if (!res.ok) {
          console.error("Failed to upload image");
        }
      } catch (e) {
        console.error("Error uploading image:", e);
      }
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Sidebar ── */}
      <Sidebar />

      {/* ── Main column ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Page Header */}
        <Header breadcrumb="CONTENT · WORKFLOW" title="Editorial Approval" />

        {/* Page Body */}
        <main className="flex-1 bg-brand-cream px-6 py-6 flex flex-col gap-5 overflow-auto">



          {/* ── Three-column layout ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "220px 1fr 260px",
              gap: "20px",
              alignItems: "start",
            }}
          >

            {/* ── LEFT: Approval Queue ── */}
            <ApprovalQueue
              items={queue}
              activeId={activeId}
              onSelect={(item) => setActiveId(item.id)}
            />

            {/* ── CENTER: Article Detail ── */}
            <div className="bg-white rounded shadow-sm flex flex-col overflow-hidden">

              {/* Article meta bar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Category badge */}
                  {article && (
                    <span className="font-label text-[9px] tracking-[0.15em] px-2 py-0.5 rounded-sm border border-brand-red text-brand-red bg-red-50">
                      {article.category}
                    </span>
                  )}
                  {article && (
                    <span className="font-label text-[10px] text-gray-400">
                      {article.id} · {article.source} · {article.time}
                    </span>
                  )}
                </div>
                {/* Edit Content button */}
                <button
                  id="edit-content-btn"
                  className="flex items-center gap-1.5 font-label text-[10px] tracking-wide px-3 py-1.5 border border-gray-300 rounded text-brand-black hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Content
                </button>
              </div>

              {/* Headline */}
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-heading text-xl font-semibold text-brand-black leading-snug">
                  {article ? article.headline : "No article selected"}
                </h2>
              </div>

              {/* Side-by-side comparison */}
              {article ? (
                <ArticleComparison
                  original={article.original}
                  rewritten={article.rewritten}
                  onChangeRewritten={(newText) => {
                    setRawArticles(prev => prev.map(a => 
                      a.id === activeRawArticle.id 
                        ? { ...a, edited_content: newText } 
                        : a
                    ));
                  }}
                />
              ) : (
                <div className="p-5 text-gray-500">No article selected.</div>
              )}

              {/* Cover Image section */}
              <div className="px-5 py-4 border-t border-gray-100">
                <p className="font-label text-[9px] tracking-[0.2em] text-brand-red uppercase font-semibold mb-3">
                  Cover Image
                </p>
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-24 h-18 rounded border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0" style={{ height: "72px" }}>
                    {coverPreview ? (
                      <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    )}
                  </div>

                  {/* Image action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      id="cover-upload-btn"
                      onClick={() => fileRef.current?.click()}
                      className="font-label text-[10px] tracking-wide px-3 py-1.5 border border-gray-300 rounded text-brand-black hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Upload Image
                    </button>
                    <button
                      id="cover-ai-btn"
                      className="font-label text-[10px] tracking-wide px-3 py-1.5 rounded bg-brand-red text-white hover:bg-red-700 transition-colors"
                    >
                      AI Generate
                    </button>
                    {coverPreview && (
                      <button
                        id="cover-remove-btn"
                        onClick={() => setCoverPreview(null)}
                        className="font-label text-[10px] tracking-wide px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleCoverFile(e.target.files?.[0])}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Analysis + Controls + Decision + Notes ── */}
            <div className="flex flex-col gap-4">
              {article ? (
                <>
                  {/* SEO Meta Panel */}
                  <SeoMetaPanel
                    seoTitle={article.seoTitle}
                    metaDesc={article.metaDesc}
                    keywords={article.keywords}
                  />

                  {/* AI Analysis Panel */}
                  <AIAnalysisPanel 
                    sentiment={article.sentiment}
                    readability={article.readability}
                    seoScore={article.seoScore}
                  />

                  {/* AI Rewrite Controls */}
                  <AIRewriteControls onRerun={handleRerun} />

                  {/* Editor Decision Panel */}
                  <EditorDecisionPanel
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />

                  {/* Review Notes Panel */}
                  <ReviewNotesPanel
                    articleId={article.id}
                    notes={article.reviewNotes || []}
                    onNoteAdded={(newNote) => {
                      setRawArticles(prev => prev.map(a => 
                        a.id === article.id ? {
                          ...a,
                          review_notes: [...(a.review_notes || []), newNote]
                        } : a
                      ));
                    }}
                  />
                </>
              ) : (
                <div className="bg-white rounded shadow-sm p-5 text-gray-500 text-sm">
                  Select an article to view editorial tools.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
