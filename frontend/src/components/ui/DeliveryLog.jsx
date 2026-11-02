/**
 * DeliveryLog — message delivery log table.
 *
 * Props:
 *  - logs: { id, campaign, time, sent, delivered, read, failed, status, retryFailed }[]
 */

const STATUS_STYLES = {
  Delivered: "border-status-active text-status-active bg-green-50",
  Partial:   "border-brand-gold text-brand-gold bg-yellow-50",
  Failed:    "border-brand-red text-brand-red bg-red-50",
};

const COLS = ["CAMPAIGN", "TIME", "SENT", "DEVLI", "READ", "FAILED", "STATUS"];

export default function DeliveryLog({ logs = [] }) {
  return (
    <div className="bg-white rounded shadow-sm flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-heading text-base font-semibold text-brand-black">
          Message Delivery Log
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {COLS.map((col) => (
                <th
                  key={col}
                  className="font-label text-[8px] tracking-[0.15em] text-gray-400 text-left px-4 py-2.5 font-medium"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((row) => (
              <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                {/* Campaign */}
                <td className="px-4 py-3">
                  <p className="font-body text-[12px] font-medium text-brand-black">{row.campaign}</p>
                  <p className="font-label text-[9px] text-brand-gold mt-0.5">{row.retryFailed}</p>
                </td>
                <td className="px-4 py-3 font-label text-[11px] text-gray-500">{row.time}</td>
                <td className="px-4 py-3 font-label text-[11px] text-gray-500">{row.sent.toLocaleString()}</td>
                <td className="px-4 py-3 font-label text-[11px] text-brand-blue">{row.delivered.toLocaleString()}</td>
                <td className="px-4 py-3 font-label text-[11px] text-brand-blue">{row.read.toLocaleString()}</td>
                <td className="px-4 py-3 font-label text-[11px] text-brand-red">{row.failed}</td>
                {/* Status */}
                <td className="px-4 py-3">
                  <span
                    className={`font-label text-[9px] tracking-wider px-2 py-0.5 rounded-sm border ${
                      STATUS_STYLES[row.status] || STATUS_STYLES.Delivered
                    }`}
                  >
                    {row.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
