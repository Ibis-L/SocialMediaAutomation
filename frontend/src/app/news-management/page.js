"use client";

import { useState, useEffect, useCallback } from "react";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import NewsToolbar from "@/components/ui/NewsToolbar";
import NewsFilterTabs from "@/components/ui/NewsFilterTabs";
import NewsTable from "@/components/ui/NewsTable";
import NewsPagination from "@/components/ui/NewsPagination";
import ImportModal from "@/components/ui/ImportModal";
import CreateNewsModal from "@/components/ui/CreateNewsModal";
import EditNewsModal from "@/components/ui/EditNewsModal";
import ExportModal from "@/components/ui/ExportModal";

import {
  newsArticlesData,
  newsTabsData,
  importPreviewData,
} from "@/data/mockData";
import { getApiBaseUrl } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

export default function NewsManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const fetchArticles = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/masters/api/editor/article/`, { cache: "no-store" });
      const data = await res.json();
      const mapped = data.map(item => ({
        id: `NWS-${item.id}`,
        originalId: item.id,
        headline: item.title || item.content?.title || item.source_url,
        subtitle: item.seo_title || "",
        shortDescription: item.seo_desc || "",
        fullContent: item.edited_content || (item.content ? item.content.body_content : ""),
        tags: item.seo_keywords || "",
        wordCount: item.content ? JSON.stringify(item.content).split(" ").length : 0,
        source: item.template_name || "API",
        type: "News",
        author: "System",
        authorType: "ai",
        status: item.status || "DRAFT",
        updatedAt: new Date(item.scraped_at).toLocaleDateString(),
      }));
      setArticles(mapped);
    } catch (err) {
      console.error("Failed to fetch articles:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchArticles(), 15000);
    return () => clearInterval(interval);
  }, [fetchArticles]);

  // Modal visibility state
  const [showCreate, setShowCreate]   = useState(false);
  const [showImport, setShowImport]   = useState(false);
  const [showExport, setShowExport]   = useState(false);
  const [editArticle, setEditArticle] = useState(null);

  // Filter articles by active tab
  const filteredArticles =
    activeTab === "all"
      ? articles
      : articles.filter((a) => a.status && a.status.toLowerCase() === activeTab.toLowerCase());

  // Handlers
  const handleCreateNews = (formData) => {
    setArticles((prev) => [
      {
        id: `NWS-${Date.now()}`,
        headline: formData.headline,
        wordCount: 0,
        source: "Manual",
        type: formData.type,
        author: formData.author || "Editor",
        authorType: "human",
        status: "Draft",
        updatedAt: "Just Now",
      },
      ...prev,
    ]);
  };

  const handleSaveEdit = async (updated) => {
    // Optimistic UI update
    setArticles((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );

    // Send to backend using originalId
    if (updated.originalId) {
      try {
        const formData = new FormData();
        formData.append("status", updated.status);
        formData.append("title", updated.headline || "");
        if (updated.fullContent) formData.append("edited_content", updated.fullContent);
        if (updated.subtitle) formData.append("seo_title", updated.subtitle);
        if (updated.shortDescription) formData.append("seo_desc", updated.shortDescription);
        if (updated.tags) formData.append("seo_keywords", updated.tags);
        if (updated.coverImage instanceof File) {
          formData.append("cover_image", updated.coverImage);
        }

        await fetch(`${getApiBaseUrl()}/masters/api/editor/article/${updated.originalId}/`, {
          method: "PATCH",
          body: formData
        });
      } catch (err) {
        console.error("Failed to save edit to backend:", err);
      }
    }
  };

  const handleDelete = async (article) => {
    if (window.confirm(`Delete "${article.headline}"?`)) {
      // Optimistic UI delete
      setArticles((prev) => prev.filter((a) => a.id !== article.id));
      
      // Delete from backend database
      if (article.originalId) {
        try {
          await fetch(`${getApiBaseUrl()}/masters/api/editor/article/${article.originalId}/`, {
            method: "DELETE"
          });
        } catch (err) {
          console.error("Failed to delete from backend:", err);
        }
      }
    }
  };

  const handleDuplicate = (article) => {
    const dup = {
      ...article,
      id: `${article.id}-copy`,
      headline: `${article.headline} (Copy)`,
      status: "Draft",
      updatedAt: "Just Now",
    };
    setArticles((prev) => {
      const idx = prev.findIndex((a) => a.id === article.id);
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next;
    });
  };

  const computedTabs = [
    { key: "all", label: "All", count: articles.length },
    { key: "draft", label: "Draft", count: articles.filter(a => a.status === "DRAFT").length },
    { key: "editor_verification", label: "Pending", count: articles.filter(a => a.status === "EDITOR_VERIFICATION").length },
    { key: "approved", label: "Approved", count: articles.filter(a => a.status === "APPROVED").length },
  ];

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Page Header — same as home page */}
        <Header breadcrumb="CONTENT · LIBRARY" title="News Management">
          <button
            onClick={() => fetchArticles(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-[11px] font-label tracking-widest uppercase px-3 py-1.5 rounded border border-brand-muted text-brand-muted hover:border-brand-black hover:text-brand-black transition-colors disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "↻ Refresh"}
          </button>
        </Header>

        {/* Page body — brand-cream background with px-8 py-7 padding, matching home page exactly */}
        <main className="flex-1 bg-brand-cream px-4 sm:px-8 py-5 sm:py-7 pb-20 lg:pb-7 flex flex-col gap-5 sm:gap-6">

          {/* Single white card containing toolbar + tabs + table + pagination */}
          <section
            id="news-management-panel"
            className="bg-white rounded shadow-sm flex flex-col overflow-hidden"
            aria-label="News articles management"
          >
            {/* ── Toolbar ── */}
            {(user?.groups?.includes("Super Admin") || user?.groups?.includes("Editor") || user?.groups?.includes("News Writer")) && (
              <NewsToolbar
                onCreateNews={() => setShowCreate(true)}
                onImport={() => setShowImport(true)}
                onExport={() => setShowExport(true)}
              />
            )}

            {/* ── Filter Tabs ── */}
            <NewsFilterTabs
              tabs={computedTabs}
              activeTab={activeTab}
              onTabChange={(key) => {
                setActiveTab(key);
                setCurrentPage(1);
              }}
            />

            {/* ── Articles Table ── */}
            <NewsTable
              articles={filteredArticles}
              userGroups={user?.groups || []}
              onEdit={(a) => setEditArticle(a)}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />

            {/* ── Pagination ── */}
            <NewsPagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredArticles.length / 10) || 1}
              totalItems={filteredArticles.length}
              pageSize={10}
              onPageChange={setCurrentPage}
            />
          </section>
        </main>
      </div>

      {/* ── Modals ── */}
      <CreateNewsModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateNews}
      />
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={(rows) => console.log("Imported:", rows)}
        previewData={importPreviewData}
      />
      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        totalItems={12847}
      />
      <EditNewsModal
        isOpen={!!editArticle}
        article={editArticle}
        onClose={() => setEditArticle(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
