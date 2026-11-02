/**
 * ApprovalQueue — left sidebar list of articles pending editor review.
 *
 * Props:
 *  - items:           approvalQueueData[]
 *  - activeId:        string  (currently selected article id)
 *  - onSelect:        (item) => void
 */
export default function ApprovalQueue({ items = [], activeId, onSelect }) {
  return (
    <aside className="bg-brand-card border border-brand-border rounded flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="px-3.5 py-3.5 border-b border-brand-border">
        <h2 className="font-heading text-[20px] font-normal text-brand-black tracking-[0.03em] capitalize">
          Approval Queue
        </h2>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {items.map((item, i) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              id={`queue-item-${item.id}`}
              onClick={() => onSelect?.(item)}
              className={`w-full text-left px-3.5 py-3 transition-colors duration-150 ${
                isActive
                  ? "bg-brand-warm border-l-2 border-brand-red"
                  : "bg-brand-card hover:bg-brand-warm/50"
              } ${i < items.length - 1 ? "border-b border-brand-border" : ""}`}
            >
              {/* Category row */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.categoryDot || "bg-brand-red"}`} />
                <span className="font-label text-[10px] tracking-[0.03em] text-brand-tags capitalize">
                  {item.category}
                </span>
              </div>

              {/* Headline */}
              <p className="font-heading text-[14px] font-semibold text-brand-black leading-[14px] tracking-[0.03em] line-clamp-2 mb-1">
                {item.headline}
              </p>

              {/* Author + time */}
              <p className="font-label text-[8px] font-medium text-brand-tags tracking-[0.03em] capitalize">
                {item.author} · {item.time}
              </p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
