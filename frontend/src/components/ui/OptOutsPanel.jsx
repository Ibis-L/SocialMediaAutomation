/**
 * OptOutsPanel — list of opted-out phone numbers.
 * Props: optOuts: { id, phone, reason, time }[], totalCount: number
 */
export default function OptOutsPanel({ optOuts = [], totalCount = 312 }) {
  return (
    <div className="bg-white rounded shadow-sm flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-heading text-base font-semibold text-brand-black">Opt-Outs</h2>
        <span className="w-8 h-5 rounded-full bg-brand-red flex items-center justify-center">
          <span className="font-label text-[9px] text-white font-bold">{totalCount}</span>
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {optOuts.map((o) => (
          <div key={o.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="font-body text-[12px] font-medium text-brand-black">{o.phone}</p>
              <p className="font-label text-[9px] text-gray-400">{o.reason}</p>
            </div>
            <span className="font-label text-[9px] text-gray-400">{o.time}</span>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-gray-100">
        <p className="font-body text-[10px] text-gray-400 leading-relaxed">
          Opted-out numbers are auto-excluded from all future distributions.
        </p>
      </div>
    </div>
  );
}
