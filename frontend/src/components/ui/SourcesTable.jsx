"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import Badge from "./Badge";
import AddSourceModal from "./AddSourceModal";

const FILTERS = ["ALL SOURCES", "RSS", "WEBSITE", "API"];

/**
 * SourcesTable — configured sources list with filter tabs.
 * Props: sources (array from mockData / API)
 */
export default function SourcesTable({ sources = [], onScrapeComplete }) {
  const [activeFilter, setActiveFilter] = useState("ALL SOURCES");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scrapingId, setScrapingId] = useState(null);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }
  const [promptModal, setPromptModal] = useState({ isOpen: false, source: null, count: 1 });

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleStartScraping = async () => {
    const { source, count } = promptModal;
    setPromptModal({ isOpen: false, source: null, count: 1 });
    
    setScrapingId(source.id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/masters/api/scraper/sources/${source.id}/trigger_scrape/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: count || 1 })
      });
      const data = await res.json();
      if (res.ok) {
        // Count how many articles were actually saved by reading the stderr log
        const savedMatch = (data.stderr || '').match(/Successfully saved article/g);
        const savedCount = savedMatch ? savedMatch.length : 0;
        const dupeMatch = (data.stderr || '').match(/duplicate, skipped/g);
        const dupeCount = dupeMatch ? dupeMatch.length : 0;
        
        if (savedCount > 0) {
          showToast(`✓ Saved ${savedCount} new article${savedCount > 1 ? 's' : ''} from ${source.name}${dupeCount > 0 ? ` (${dupeCount} duplicate${dupeCount > 1 ? 's' : ''} skipped)` : ''}`, 'success');
        } else if (dupeCount > 0) {
          showToast(`All ${dupeCount} articles from ${source.name} were already saved (duplicates skipped)`, 'success');
        } else {
          showToast(`Scraping finished for ${source.name}`, 'success');
        }
        // Notify parent to refresh article list
        if (onScrapeComplete) onScrapeComplete();
      } else {
        const errMsg = data.error || `Failed to scrape ${source.name}`;
        showToast(errMsg.substring(0, 120), 'error');
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    } finally {
      setScrapingId(null);
    }
  };

  const filtered =
    activeFilter === "ALL SOURCES"
      ? sources
      : sources.filter(
          (s) => s.type.toUpperCase() === activeFilter
        );

  const typeVariant = (type) =>
    ({ RSS: "rss", Scraper: "scraper", API: "api" }[type] ?? "rss");

  const statusVariant = (status) =>
    ({ Active: "active", Error: "error", Pause: "pause" }[status] ?? "active");

  return (
    <div className="bg-brand-card border border-brand-border rounded flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b-[0.3px] border-brand-muted/30">
        <div>
          <p className="font-label text-brand-red text-[11px] tracking-[0.03em] uppercase mb-0.5">
            Source Management
          </p>
          <h2 className="font-heading text-xl font-normal text-brand-black capitalize tracking-[0.03em]">
            Configured Sources
          </h2>
        </div>
        <button
          id="add-source-btn"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 bg-brand-red text-white font-inter text-[12px] font-semibold tracking-normal capitalize px-[18px] py-[12px] rounded hover:brightness-90 transition-colors mt-1"
        >
          <span className="text-sm leading-none">+</span> Add Source
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2.5 px-4 sm:px-6 py-3 border-b-[0.3px] border-brand-muted/30 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            id={`filter-${f.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => setActiveFilter(f)}
            className={`font-label text-[11px] tracking-[0.03em] uppercase px-2.5 py-1.5 rounded border transition-colors whitespace-nowrap shrink-0 ${
              activeFilter === f
                ? "bg-brand-red text-white border-brand-red"
                : "text-brand-muted border-brand-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full">
          <thead>
            <tr className="border-b-[0.3px] border-brand-muted/30">
              {["SOURCES", "TYPE", "LAST SCRAPE", "24TH", "STATUS", "ACTIONS"].map((col) => (
                <th
                  key={col}
                  className="font-label text-[11px] tracking-[0.03em] text-brand-black text-left px-3 sm:px-6 py-3 font-normal uppercase whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((source, i) => (
              <tr
                key={source.id}
                className={`border-b-[0.3px] border-brand-muted/30 hover:bg-gray-50/60 transition-colors ${
                  i === filtered.length - 1 ? "border-b-0" : ""
                }`}
              >
                {/* Source name + tags */}
                <td className="px-3 sm:px-6 py-3.5">
                  <p className="font-inter text-[14px] font-normal text-brand-black capitalize tracking-[0.03em]">
                    {source.name}
                  </p>
                  <p className="font-label text-[8px] text-brand-tags tracking-[0.03em] capitalize mt-0.5">
                    {source.tags.join(" · ")}
                  </p>
                </td>

                {/* Type badge */}
                <td className="px-3 sm:px-6 py-3.5">
                  <Badge variant={typeVariant(source.type)}>
                    {source.type}
                  </Badge>
                </td>

                {/* Last scrape */}
                <td className="px-3 sm:px-6 py-3.5">
                  <span className="font-label text-[11px] text-brand-black tracking-[0.03em] capitalize">
                    {source.lastScrape}
                  </span>
                </td>

                {/* 24h count */}
                <td className="px-3 sm:px-6 py-3.5">
                  <span className="font-label text-[11px] text-brand-black tracking-[0.03em] capitalize">
                    {source.count24h}
                  </span>
                </td>

                {/* Status */}
                <td className="px-3 sm:px-6 py-3.5">
                  <Badge variant={statusVariant(source.status)}>
                    {source.status}
                  </Badge>
                </td>

                {/* Actions */}
                <td className="px-3 sm:px-6 py-3.5">
                  <button
                    disabled={scrapingId === source.id}
                    onClick={() => {
                      setPromptModal({ isOpen: true, source, count: 1 });
                    }}
                    className="flex items-center justify-center gap-1.5 bg-brand-blue text-white text-[10px] font-bold px-3 py-1.5 rounded hover:bg-blue-600 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed w-[70px]"
                  >
                    {scrapingId === source.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Run"
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <AddSourceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded shadow-lg text-sm font-medium z-50 animate-in slide-in-from-bottom-5 ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
      {/* Run Prompt Modal */}
      {promptModal.isOpen && promptModal.source && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-heading text-base font-semibold text-brand-black">Start Scraping</h3>
              <button onClick={() => setPromptModal({ isOpen: false, source: null, count: 1 })} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <p className="font-body text-sm text-brand-muted">
                How many articles do you want to extract from <span className="font-semibold text-brand-black capitalize">{promptModal.source.name}</span>?
              </p>
              <div>
                <label className="block font-label text-[10px] tracking-widest text-brand-black uppercase mb-1.5">Article Count</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded font-inter text-sm focus:outline-none focus:border-brand-blue transition-colors"
                  value={promptModal.count}
                  onChange={(e) => setPromptModal(p => ({ ...p, count: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                />
              </div>
            </div>
            <div className="px-5 py-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
              <button 
                onClick={() => setPromptModal({ isOpen: false, source: null, count: 1 })}
                className="font-body text-[12px] font-medium px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 text-brand-black transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleStartScraping}
                className="font-body text-[12px] font-semibold px-4 py-2 rounded bg-brand-blue text-white hover:bg-blue-600 transition-colors"
              >
                Start Scraping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
