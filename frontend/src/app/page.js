"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import StatCard from "@/components/ui/StatCard";
import SourcesTable from "@/components/ui/SourcesTable";
import DuplicateDetection from "@/components/ui/DuplicateDetection";
import RawNewsFeed from "@/components/ui/RawNewsFeed";
import { api } from "@/providers/AuthProvider";

export default function HomePage() {
  const [statsData, setStatsData] = useState([]);
  const [sourcesData, setSourcesData] = useState([]);
  const [rawFeedData, setRawFeedData] = useState([]);
  const [duplicateBreakdown, setDuplicateBreakdown] = useState(null);
  const [totalUsers, setTotalUsers] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAll = useCallback(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const statsRes = await fetch(`${baseUrl}/masters/api/scraper/stats/`, { cache: "no-store" });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setStatsData([
          { id: "active-sources", label: "ACTIVE SOURCES", value: String(stats.active_sources || 0), suffix: "" },
          { id: "scraped-24h", label: "SCRAPED (24H)", value: String(stats.scraped_24h || 0), suffix: "" },
          { id: "duplicates", label: "DUPLICATES CAUGHT", value: String(stats.duplicates || 0), suffix: "" },
          { id: "failed", label: "FAILED FETCHES", value: String(stats.failed || 0), suffix: "", valueColor: "text-red-500" },
        ]);
        setDuplicateBreakdown(stats.duplicate_breakdown || null);
      }

      const sourcesRes = await fetch(`${baseUrl}/masters/api/scraper/sources/`, { cache: "no-store" });
      if (sourcesRes.ok) {
        const sources = await sourcesRes.json();
        setSourcesData(sources.map(s => ({
          id: s.id,
          name: s.name,
          domain: s.domain,
          status: s.status,
          type: s.type || "WEBSITE",
          lastScrape: s.last_scraped_at ? new Date(s.last_scraped_at).toLocaleString() : "Never",
          count24h: s.scraped_24h || 0,
          articles24h: s.scraped_24h || 0,
          tags: ["News"],
        })));
      }

      const feedRes = await fetch(`${baseUrl}/masters/api/scraper/feed/`, { cache: "no-store" });
      if (feedRes.ok) {
        const feed = await feedRes.json();
        setRawFeedData(feed.map(f => ({
          id: f.id,
          timestamp: new Date(f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: f.template_name || 'System',
          status: f.status,
          message: f.message || (f.status === 'NEW' ? 'Successfully scraped' : f.status),
          url: f.url
        })));
      }

      // Fetch user stats
      try {
        const userStatsRes = await api.get("/api/auth/user-stats/");
        setTotalUsers(userStatsRes.data.total_users);
      } catch {
        // Non-blocking if unauthenticated
      }
    } catch (error) {
      console.error("Failed to fetch data from Django:", error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll, refreshKey]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleScrapeComplete = useCallback(() => {
    // Re-fetch everything after a scrape completes
    setTimeout(fetchAll, 1000);
  }, [fetchAll]);

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Page Header */}
        <Header
          breadcrumb="CONTENT › INGESTION"
          title="News Sources & Scraping"
        />

        {/* Page body */}
        <main className="flex-1 bg-brand-cream px-4 sm:px-8 py-5 sm:py-7 pb-20 lg:pb-7 flex flex-col gap-5 sm:gap-6">
          {/* ── Stats Row ── */}
          <section
            id="stats-row"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4"
            aria-label="Summary statistics"
          >
            {statsData.map((stat) => (
              <StatCard
                key={stat.id}
                id={stat.id}
                label={stat.label}
                value={stat.value}
                suffix={stat.suffix}
                valueColor={stat.valueColor}
              />
            ))}
            {totalUsers !== null && (
              <StatCard
                id="total-users"
                label="TOTAL USERS"
                value={String(totalUsers)}
                suffix=""
              />
            )}
          </section>

          {/* ── Two-column grid ── */}
          <section
            id="main-grid"
            className="grid grid-cols-1 lg:grid-cols-[1fr_431px] gap-5 items-start"
            aria-label="Sources and detection panels"
          >
            {/* Left: Configured Sources table */}
            <SourcesTable sources={sourcesData} onScrapeComplete={handleScrapeComplete} />

            {/* Right: stacked panels */}
            <div className="flex flex-col gap-5">
              {duplicateBreakdown && <DuplicateDetection data={duplicateBreakdown} />}
              <RawNewsFeed items={rawFeedData} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
