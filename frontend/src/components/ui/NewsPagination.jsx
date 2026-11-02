/**
 * NewsPagination — page number controls + "Showing X of Y" label.
 *
 * Props:
 *  - currentPage:  number
 *  - totalPages:   number
 *  - totalItems:   number
 *  - pageSize:     number
 *  - onPageChange: (page: number) => void
 */
export default function NewsPagination({
  currentPage = 1,
  totalPages = 3,
  totalItems = 12847,
  pageSize = 10,
  onPageChange,
}) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Show at most 5 page numbers around currentPage
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
      {/* Left: item range */}
      <span className="font-label text-[10px] text-gray-400 tracking-wide">
        Showing {start} Of {totalItems.toLocaleString()}
      </span>

      {/* Right: page buttons */}
      <div className="flex items-center gap-1">
        {pages.map((p) => (
          <button
            key={p}
            id={`page-btn-${p}`}
            onClick={() => onPageChange?.(p)}
            className={`
              w-7 h-7 flex items-center justify-center font-label text-[10px] rounded transition-colors duration-150
              ${
                p === currentPage
                  ? "bg-brand-red text-white"
                  : "text-gray-500 hover:bg-gray-100 border border-gray-200"
              }
            `}
          >
            {p}
          </button>
        ))}

        {/* Next arrow */}
        <button
          id="page-next-btn"
          onClick={() => onPageChange?.(Math.min(currentPage + 1, totalPages))}
          className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-100 transition-colors duration-150 ml-0.5"
          aria-label="Next page"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
