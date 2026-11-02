/**
 * RawNewsFeed — live news feed panel with tag badges.
 * Props: items (array from mockData / WebSocket feed)
 */

const tagStyles = {
  new:   "text-status-active",
  dupe:  "text-brand-red",
  error: "text-brand-red",
};

export default function RawNewsFeed({ items = [] }) {
  return (
    <div className="bg-white border border-brand-border rounded p-5 sm:p-6">
      {/* Title with live indicator */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2.5 h-2.5 rounded-full bg-brand-red animate-pulse" />
        <h2 className="font-heading text-[20px] font-normal text-brand-black tracking-[0.03em] capitalize">
          Raw News Feed
        </h2>
      </div>

      <div className="flex flex-col">
        {items.map((item, i) => {
          const tagKey = item.tagVariant?.toLowerCase() ?? "new";
          const tagClass = tagStyles[tagKey] ?? tagStyles.new;

          return (
            <div key={item.id}>
              <div
                className="flex items-start justify-between py-3 gap-3 hover:bg-gray-50/60 -mx-2 px-2 rounded transition-colors"
              >
                {/* Article info */}
                <div className="flex-1 min-w-0">
                  <p className="font-stat text-[14px] font-semibold text-brand-black leading-[18px] tracking-[0.03em] capitalize">
                    {item.title}
                  </p>
                  <p className="font-label text-[8px] text-brand-tags tracking-[0.03em] capitalize mt-0.5">
                    {item.source} &middot; {item.time}
                  </p>
                </div>

                {/* Tag */}
                <span className={`font-label text-[11px] tracking-[0.03em] capitalize shrink-0 mt-0.5 ${tagClass}`}>
                  {item.tag}
                </span>
              </div>
              {/* Divider (except last) */}
              {i < items.length - 1 && (
                <div className="h-px bg-brand-muted/30" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
