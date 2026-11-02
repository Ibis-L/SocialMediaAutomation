/**
 * StatCard — reusable stat display card.
 * Props: label, value, suffix, valueColor (Tailwind class)
 */
export default function StatCard({ id, label, value, suffix, valueColor }) {
  return (
    <div
      id={id}
      className="bg-brand-card border border-brand-border rounded p-4 sm:p-5 flex flex-col gap-1 min-w-0"
    >
      <span className="font-label text-[10px] sm:text-[11px] tracking-[0.03em] text-brand-muted uppercase truncate">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5 sm:gap-2 mt-1">
        <span className={`font-stat text-[36px] sm:text-[52px] font-medium leading-none ${valueColor}`}>
          {value}
        </span>
        <span className="font-inter text-[11px] text-brand-muted tracking-[0.03em]">
          {suffix}
        </span>
      </div>
    </div>
  );
}
