/**
 * NewsStatusBadge — outlined pill badge for news article statuses.
 *
 * variant: "pending" | "approved" | "rewritten" | "draft"
 *          | "rejected" | "published" | "scheduled"
 */

const variantMap = {
  "pending approval": {
    label: "Pending Approval",
    className: "border border-orange-400 text-orange-500 bg-orange-50",
  },
  pending: {
    label: "Pending Approval",
    className: "border border-orange-400 text-orange-500 bg-orange-50",
  },
  approved: {
    label: "Approved",
    className: "border border-status-active text-status-active bg-green-50",
  },
  rewritten: {
    label: "Rewritten",
    className: "border border-gray-400 text-gray-500 bg-gray-50",
  },
  draft: {
    label: "Draft",
    className: "border border-brand-gold text-brand-gold bg-yellow-50",
  },
  rejected: {
    label: "Rejected",
    className: "border border-brand-red text-brand-red bg-red-50",
  },
  published: {
    label: "Published",
    className: "border border-brand-blue text-brand-blue bg-blue-50",
  },
  scheduled: {
    label: "Scheduled",
    className: "border border-purple-500 text-purple-500 bg-purple-50",
  },
};

/**
 * @param {{ status: string, className?: string }} props
 * `status` is matched case-insensitively to one of the variant keys.
 */
export default function NewsStatusBadge({ status = "", className = "" }) {
  const key = status.toLowerCase();
  const config = variantMap[key] ?? {
    label: status,
    className: "border border-gray-300 text-gray-400 bg-gray-50",
  };

  return (
    <span
      className={`inline-block font-label text-[9px] tracking-wider px-2 py-0.5 rounded-sm whitespace-nowrap ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
