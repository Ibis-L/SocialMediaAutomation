"use client";

/**
 * WhatsAppAccounts — panel listing connected WhatsApp business accounts.
 *
 * Props:
 *  - accounts: { id, name, phone, status }[]
 */
export default function WhatsAppAccounts({ accounts = [] }) {
  return (
    <div className="bg-white rounded shadow-sm flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-heading text-base font-semibold text-brand-black">
          WhatsApp Accounts
        </h2>
      </div>

      <div className="divide-y divide-gray-50">
        {accounts.map((acc) => (
          <div key={acc.id} className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              {/* WhatsApp icon */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  acc.status === "connected" ? "bg-status-active/10" : "bg-gray-100"
                }`}
              >
                <svg
                  className={`w-4 h-4 ${
                    acc.status === "connected" ? "text-status-active" : "text-gray-400"
                  }`}
                  fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>

              <div>
                <p className="font-body text-[12px] font-medium text-brand-black">{acc.name}</p>
                <p className="font-label text-[9px] text-gray-400">{acc.phone}</p>
              </div>
            </div>

            <button
              id={`wa-account-${acc.id}`}
              className={`font-label text-[10px] tracking-wide px-3 py-1.5 rounded border transition-colors ${
                acc.status === "connected"
                  ? "border-status-active text-status-active hover:bg-green-50"
                  : "border-gray-300 text-gray-400 hover:bg-gray-50"
              }`}
            >
              {acc.status === "connected" ? "Logout" : "Reconnect"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
