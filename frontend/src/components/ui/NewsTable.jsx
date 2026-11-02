import NewsStatusBadge from "./NewsStatusBadge";

/**
 * NewsTable — main articles table for the News Management page.
 *
 * Props:
 *  - articles: newsArticlesData[]
 *  - onEdit:      (article) => void
 *  - onDuplicate: (article) => void
 *  - onDelete:    (article) => void
 */

const COLS = ["HEADLINE", "TYPE", "AUTHOR", "STATUS", "UPDATE", "ACTION"];

/** Color for author name based on authorType */
function AuthorCell({ author, authorType }) {
  if (authorType === "ai") {
    return (
      <span className="font-label text-[11px] text-brand-red font-medium">
        {author}
      </span>
    );
  }
  return (
    <span className="font-label text-[11px] text-gray-600">{author}</span>
  );
}

/** Three icon action buttons */
function ActionButtons({ article, onEdit, onDuplicate, onDelete }) {
  return (
    <div className="flex items-center gap-2">
      {/* Edit */}
      <button
        id={`edit-${article.id}`}
        onClick={() => onEdit?.(article)}
        title="Edit"
        className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:border-brand-blue hover:text-brand-blue transition-colors duration-150"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      {/* Duplicate / Copy */}
      <button
        id={`copy-${article.id}`}
        onClick={() => onDuplicate?.(article)}
        title="Duplicate"
        className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:border-brand-gold hover:text-brand-gold transition-colors duration-150"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Delete */}
      <button
        id={`delete-${article.id}`}
        onClick={() => onDelete?.(article)}
        title="Delete"
        className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:border-brand-red hover:text-brand-red transition-colors duration-150"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

export default function NewsTable({ articles = [], userGroups = [], onEdit, onDuplicate, onDelete }) {
  const canEdit = userGroups.includes("Super Admin") || userGroups.includes("Editor") || userGroups.includes("News Writer");

  return (
    <div className="overflow-x-auto flex-1">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {COLS.map((col) => {
              if (col === "ACTION" && !canEdit) return null;
              return (
                <th
                  key={col}
                  className="font-label text-[9px] tracking-[0.15em] text-gray-400 text-left px-6 py-3 font-medium"
                >
                  {col}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {articles.map((article, i) => (
            <tr
              key={article.id}
              className={`border-b border-gray-50 hover:bg-gray-50/70 transition-colors duration-100 ${
                i === articles.length - 1 ? "border-b-0" : ""
              }`}
            >
              {/* Headline */}
              <td className="px-6 py-3.5 max-w-xs">
                <p className="font-body text-sm font-medium text-brand-black leading-snug truncate">
                  {article.headline}
                </p>
                <p className="font-label text-[9px] text-gray-400 tracking-wide mt-0.5">
                  {article.id} · {article.wordCount} Words · {article.source}
                </p>
              </td>

              {/* Type */}
              <td className="px-6 py-3.5">
                <span className="font-body text-sm text-gray-500">{article.type}</span>
              </td>

              {/* Author */}
              <td className="px-6 py-3.5">
                <AuthorCell author={article.author} authorType={article.authorType} />
              </td>

              {/* Status */}
              <td className="px-6 py-3.5">
                <NewsStatusBadge status={article.status} />
              </td>

              {/* Updated at */}
              <td className="px-6 py-3.5">
                <span className="font-label text-[10px] text-gray-400">{article.updatedAt}</span>
              </td>

              {/* Actions */}
              {canEdit && (
                <td className="px-6 py-3.5">
                  <ActionButtons
                    article={article}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
