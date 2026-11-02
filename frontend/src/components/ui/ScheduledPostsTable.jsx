/**
 * ScheduledPostsTable — table of scheduled/published posts with actions.
 *
 * Props:
 *  - posts: { id, when, post, platforms, action }[]
 */
const COLS = ["WHEN", "POST", "PLATFORMS", "MEMBERS", "ACTION"];

export default function ScheduledPostsTable({ posts = [] }) {
  return (
    <div className="bg-brand-card border border-brand-border rounded flex flex-col overflow-hidden mt-6">
      <div className="flex items-center justify-between px-7 py-5">
        <h2 className="font-heading text-[20px] font-semibold text-black leading-[18px]">
          Scheduled &amp; Published Posts
        </h2>
        <button
          id="new-post-btn"
          className="flex items-center gap-1 px-4 py-2 rounded bg-brand-red text-white hover:bg-red-700 transition-colors"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-inter text-[10px] font-semibold capitalize leading-[18px]">
            New post
          </span>
        </button>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-t border-b border-brand-border">
            {COLS.map((col, idx) => (
              <th
                key={col}
                className={`font-label text-[11px] text-[#727272] uppercase font-normal tracking-[0.03em] text-left py-3.5 ${
                  idx === 0 ? "pl-7" : "px-5"
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {posts.map((row) => (
            <tr key={row.id} className="border-b border-brand-border hover:bg-black/5 transition-colors">
              <td className="pl-7 pr-5 py-4 font-inter text-[14px] text-black whitespace-nowrap leading-[18px]">
                {row.when}
              </td>
              <td className="px-5 py-4 font-inter text-[14px] text-black leading-[18px]">
                {row.post}
              </td>
              <td className="px-5 py-4 font-label text-[11px] text-black uppercase leading-[18px]">
                {row.platforms}
              </td>
              <td className="px-5 py-4 font-label text-[11px] text-black leading-[18px]">
                {/* Note: Mock data doesn't have members for these rows, rendering placeholder or empty */}
                {row.members || "-"}
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <button className="font-label text-[11px] px-3 py-1.5 rounded border border-brand-blue text-brand-blue hover:bg-blue-50 transition-colors leading-[18px]">
                    {row.action}
                  </button>
                  <button className="font-label text-[10px] px-3 py-1.5 rounded border border-brand-red text-brand-red hover:bg-red-50 transition-colors leading-[18px]">
                    CANCEL
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
