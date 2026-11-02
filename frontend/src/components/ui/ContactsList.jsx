/**
 * ContactsList — communities, groups & contacts table.
 * Props: contacts: { id, name, type, members, growth }[]
 */
const COLS = ["LIST", "TYPE", "MEMBERS", "24H"];

export default function ContactsList({ contacts = [] }) {
  return (
    <div className="bg-white rounded shadow-sm flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-heading text-base font-semibold text-brand-black">
          Communities, Group &amp; Contacts
        </h2>
        <div className="flex gap-2">
          <button id="new-list-btn" className="font-label text-[10px] tracking-wide px-3 py-1.5 rounded bg-brand-red text-white hover:bg-red-700 transition-colors">+ New List</button>
          <button id="export-contacts-btn" className="font-label text-[10px] tracking-wide px-3 py-1.5 rounded border border-gray-300 text-brand-black hover:bg-gray-50 transition-colors">↓ Export</button>
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {COLS.map((c) => (<th key={c} className="font-label text-[8px] tracking-[0.15em] text-gray-400 text-left px-5 py-2.5 font-medium">{c}</th>))}
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
              <td className="px-5 py-3 font-body text-[12px] font-medium text-brand-black">{c.name}</td>
              <td className="px-5 py-3 font-label text-[9px] tracking-wider text-gray-500">{c.type}</td>
              <td className="px-5 py-3 font-label text-[11px] text-gray-500">{c.members.toLocaleString()}</td>
              <td className="px-5 py-3 font-label text-[11px] text-status-active font-semibold">{c.growth}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
