/**
 * Badge — reusable pill/tag badge.
 *
 * variant: "rss" | "scraper" | "api" | "active" | "error" | "pause"
 * size: "sm" | "xs"
 */

const variantStyles = {
  // Source type badges (outlined, no bg fill — per Figma)
  rss:     "border-[0.5px] border-brand-blue text-brand-blue",
  scraper: "border-[0.5px] border-brand-red text-brand-red",
  api:     "border-[0.5px] border-badge-api text-badge-api",

  // Status badges (dot + text)
  active:  "text-status-active",
  error:   "text-status-error",
  pause:   "text-status-error",

  // Feed tags
  new:   "text-status-active font-semibold",
  dupe:  "text-brand-red font-semibold",
  errortag: "text-status-error font-semibold",
};

export default function Badge({ variant = "rss", children, className = "" }) {
  const isStatus = ["active", "error", "pause"].includes(variant);
  const isFeedTag = ["new", "dupe", "errortag"].includes(variant);

  if (isStatus) {
    const dotColor = {
      active: "bg-status-active",
      error: "bg-status-error",
      pause: "bg-status-error",
    }[variant];

    return (
      <span className={`flex items-center gap-1.5 font-label text-[11px] tracking-[0.03em] capitalize ${variantStyles[variant]} ${className}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
        {children}
      </span>
    );
  }

  if (isFeedTag) {
    return (
      <span className={`font-label text-[11px] tracking-[0.03em] capitalize ${variantStyles[variant]} ${className}`}>
        {children}
      </span>
    );
  }

  return (
    <span className={`font-label text-[11px] tracking-[0.03em] capitalize px-2.5 py-0 rounded ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
