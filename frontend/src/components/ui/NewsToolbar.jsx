import Link from 'next/link';

/**
 * NewsToolbar — action bar for the News Management page.
 *
 * Props:
 *  - onCreateNews: () => void
 *  - onImport:     () => void
 *  - onExport:     () => void
 */
export default function NewsToolbar({ onCreateNews, onImport, onExport }) {
  return (
    <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
      {/* Primary: Create News */}
      <button
        id="create-news-btn"
        onClick={onCreateNews}
        className="flex items-center gap-1.5 bg-brand-red text-white font-label text-[10px] tracking-wider px-4 py-2.5 rounded hover:bg-red-700 active:scale-95 transition-all duration-150"
      >
        <span className="text-base leading-none font-light">+</span>
        Create News
      </button>


      {/* Secondary: Import */}
      <button
        id="import-news-btn"
        onClick={onImport}
        className="flex items-center gap-1.5 bg-white text-brand-black font-label text-[10px] tracking-wider px-4 py-2 rounded border border-gray-300 hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition-all duration-150"
      >
        <span className="text-xs leading-none">↑</span>
        Import Excel / Csv / Docs
      </button>

      {/* Secondary: Export */}
      <button
        id="export-news-btn"
        onClick={onExport}
        className="flex items-center gap-1.5 bg-white text-brand-black font-label text-[10px] tracking-wider px-4 py-2 rounded border border-gray-300 hover:border-gray-400 hover:bg-gray-50 active:scale-95 transition-all duration-150"
      >
        <span className="text-xs leading-none">↓</span>
        Export
      </button>
    </div>
  );
}
