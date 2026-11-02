/**
 * DuplicateDetection — shows duplicate filtering stats with progress bars.
 * Props: data (from mockData / API)
 */

const barColor = {
  blue: "bg-brand-blue",
  gold: "bg-brand-gold",
  red:  "bg-brand-red",
};

export default function DuplicateDetection({ data }) {
  if (!data) return null;

  return (
    <div className="bg-white border border-brand-border rounded p-5 sm:p-6">
      <h2 className="font-heading text-[20px] font-normal text-brand-black tracking-[0.03em] capitalize mb-1">
        Duplicate Detection
      </h2>
      <p className="font-inter text-[11px] text-brand-black leading-[18px] tracking-[0.03em] capitalize mb-5">
        {data.description}
      </p>

      <div className="flex flex-col gap-4">
        {data.methods.map((method) => {
          const pct = Math.round((method.hits / method.maxHits) * 100);
          return (
            <div key={method.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-inter text-[12px] text-brand-black tracking-[0.03em] capitalize">
                  {method.name}
                </span>
                <span className="font-label text-[11px] text-brand-muted tracking-[0.03em]">
                  {method.hits} hit
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-brand-track rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor[method.variant]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
