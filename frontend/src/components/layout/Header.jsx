"use client";

import { useState } from "react";

/**
 * Reusable page header.
 * Props:
 *  - breadcrumb: string  e.g. "CONTENT > INGESTION"
 *  - title: string       e.g. "News Sources & Scraping"
 */
export default function Header({ breadcrumb, title, children }) {
  const [searchValue, setSearchValue] = useState("");

  return (
    <header className="bg-white border-b border-gray-200 relative">
      {/* Blue left accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-blue" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-8 py-4 sm:py-5 pl-14 sm:pl-10">
        {/* Left: breadcrumb + title */}
        <div>
          {breadcrumb && (
            <p className="font-label text-brand-red text-[11px] tracking-[0.03em] uppercase mb-1">
              {breadcrumb}
            </p>
          )}
          <h1 className="font-heading text-xl sm:text-[30px] font-semibold text-brand-black leading-[60px]">
            {title}
          </h1>
        </div>

        {/* Right: extra actions */}
        <div className="flex items-center gap-3">
          {children}
        </div>
      </div>
    </header>
  );
}
