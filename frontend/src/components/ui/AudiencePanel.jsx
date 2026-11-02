/**
 * AudiencePanel — displays audience breakdown (Communities, Group, Individual Contact)
 * and an Import Contact button.
 *
 * Props:
 *  - communities: number
 *  - groups:      number
 *  - contacts:    number
 */
export default function AudiencePanel({ communities = 0, groups = 0, contacts = 0 }) {
  const rows = [
    { label: "Communities",       value: communities },
    { label: "Group",             value: groups },
    { label: "Individual Contact", value: contacts.toLocaleString() },
  ];

  return (
    <div className="bg-white rounded shadow-sm flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-heading text-base font-semibold text-brand-black">
          Audience
        </h2>
      </div>

      <div className="divide-y divide-gray-50">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-5 py-3">
            <span className="font-body text-[12px] text-brand-black">{r.label}</span>
            <span className="font-label text-[11px] text-gray-400">{r.value}</span>
          </div>
        ))}
      </div>

      {/* Import button */}
      <div className="px-5 py-4 border-t border-gray-100">
        <button
          id="import-contacts-btn"
          className="w-full py-2.5 border border-gray-200 rounded font-label text-[10px] tracking-wider text-brand-black hover:bg-gray-50 transition-colors"
        >
          Import Contact . CSV / EXCEL
        </button>
      </div>
    </div>
  );
}
