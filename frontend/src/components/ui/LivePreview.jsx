/**
 * LivePreview — WhatsApp-style message preview card (right panel).
 *
 * Props:
 *  - channelName: string
 *  - members:     number
 *  - headline:    string
 *  - body:        string
 *  - link:        string
 */
export default function LivePreview({
  channelName = "SS Local · Breaking",
  members = 8400,
  headline = "",
  body = "",
  link = "sslocal.in/N/8841",
}) {
  return (
    <div className="bg-white rounded shadow-sm flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-heading text-base font-semibold text-brand-black">
          Live Preview
        </h2>
      </div>

      {/* WhatsApp-style chat preview */}
      <div className="p-4">
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "#1b5e20" }}
        >
          {/* Channel header */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center flex-shrink-0">
              <span className="text-white font-label text-[8px] font-bold">SS</span>
            </div>
            <div>
              <p className="text-white font-body text-[12px] font-semibold">{channelName}</p>
              <p className="text-white/60 font-label text-[9px]">
                Community · {members.toLocaleString()} Members
              </p>
            </div>
          </div>

          {/* Cover image placeholder */}
          <div
            className="mx-3 rounded-lg flex items-center justify-center"
            style={{ background: "#b71c1c", height: "120px" }}
          >
            <span className="text-white/60 font-label text-[10px] tracking-wider uppercase">
              Cover Image
            </span>
          </div>

          {/* Message body */}
          <div className="px-4 py-3">
            <div className="flex items-start gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full bg-brand-red mt-1 flex-shrink-0" />
              <p className="text-white font-body text-[11px] leading-relaxed">
                <strong>*BREAKING*</strong> — {headline || "Punjab Cabinet Clears ₹2,400 Cr Infrastructure Package. Roads, Bridges And Water-Supply Projects Across Districts; Work Begins Within Weeks."}
              </p>
            </div>

            <p className="text-white/70 font-body text-[10px] mt-2">
              Read More → {link}
            </p>

            {/* Checkmarks */}
            <div className="flex justify-end mt-1">
              <svg className="w-4 h-4 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm-6.75 6.75L6.41 8.91 5 10.33l5.84 5.84 1.41-1.42zm-3.51 0l-1.42 1.42L12.16 21l1.41-1.41-5.83-5.84z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
