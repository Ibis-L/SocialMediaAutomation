/**
 * DeliveryStatsPanel — horizontal bar chart for Sent, Delivered, Read, Failed.
 * Reuses the same pattern as DuplicateDetection but adapted for delivery stats.
 *
 * Props:
 *  - stats: { label, value, color, max }[]
 */
export default function DeliveryStatsPanel({ stats = [] }) {
  const globalMax = Math.max(...stats.map((s) => s.max), 1);

  return (
    <div className="bg-white rounded shadow-sm p-5 flex flex-col gap-4">
      <h3 className="font-heading text-base font-semibold text-brand-black">
        Delivery Statistics
      </h3>

      <div className="flex flex-col gap-3">
        {stats.map((stat) => {
          const pct = Math.round((stat.value / globalMax) * 100);
          return (
            <div key={stat.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-body text-[12px] text-brand-black">{stat.label}</span>
                <span className="font-label text-[10px] text-gray-400">
                  {stat.value.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${stat.color} transition-all duration-500`}
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
