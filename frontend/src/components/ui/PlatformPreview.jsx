/**
 * PlatformPreview — shows Twitter-style and Instagram-style previews of a post.
 *
 * Props:
 *  - caption: string
 */
export default function PlatformPreview({ caption = "" }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Section label */}
      <p className="font-label text-[14px] tracking-[0.03em] text-[#727272] uppercase">
        PLATFORM PREVIEW
      </p>

      {/* Twitter / X preview */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-[40px] h-[40px] rounded-full bg-brand-red flex items-center justify-center flex-shrink-0">
              <span className="text-white font-heading text-[23px] leading-[18px]">sS</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="font-inter text-[16px] font-medium text-black tracking-[0.03em] capitalize">SS Local News</span>
                <span className="font-label text-[12px] text-[#727272] tracking-[0.03em]">@sslocal · 1m</span>
              </div>
              <p className="font-inter text-[12px] text-black mt-1 leading-[18px] tracking-[0.03em] capitalize">
                {caption || "Clinical, calm, clinical again — India wrap up the series in Mohali under the lights. Report + highlights 👇 #INDvAUS"}
              </p>
            </div>
          </div>

          {/* Image placeholder */}
          <div className="mt-3 ml-[52px] rounded-[14px] bg-gradient-to-br from-green-800 to-blue-900 flex items-center justify-center overflow-hidden" style={{ height: "164px" }}>
            <div className="text-center text-white">
              <p className="font-label text-[8px] tracking-wider uppercase opacity-60">ICC Men&apos;s World Cup</p>
              <p className="font-heading text-lg font-bold mt-1">IND vs AUS</p>
            </div>
          </div>

          {/* Engagement */}
          <div className="flex items-center gap-6 mt-4 ml-[52px] font-label text-[12px] text-[#727272] tracking-[0.03em]">
            <span>↩ 12</span>
            <span>↻ 345</span>
            <span className="text-brand-red">❤ 12.5M</span>
          </div>
        </div>
      </div>

      {/* Instagram preview */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-[40px] h-[40px] rounded-full bg-brand-red flex items-center justify-center flex-shrink-0">
              <span className="text-white font-heading text-[23px] leading-[18px]">sS</span>
            </div>
            <span className="font-inter text-[16px] font-medium text-black tracking-[0.03em]">SSlocal. news</span>
          </div>
          <span className="font-label text-[12px] text-gray-400">•••</span>
        </div>

        {/* Image */}
        <div className="bg-gradient-to-br from-green-800 to-blue-900 flex items-center justify-center" style={{ height: "241px" }}>
          <div className="text-center text-white">
            <p className="font-label text-[8px] tracking-wider uppercase opacity-60">ICC Men&apos;s World Cup</p>
            <p className="font-heading text-lg font-bold mt-1">IND vs AUS</p>
            <p className="font-label text-[9px] mt-0.5 opacity-60">HEAD TO HEAD</p>
          </div>
        </div>

        {/* Engagement */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-6 font-label text-[12px] text-[#727272] tracking-[0.03em] mb-3">
            <span>↩ 12</span>
            <span>↻ 345</span>
            <span className="text-brand-red">❤ 12.5M</span>
          </div>
          <p className="font-inter text-[12px] text-black leading-[18px] tracking-[0.03em] capitalize">
            <strong className="font-bold">SSlocal.News</strong>{" "}
            {caption || "Clinical, calm, clinical again — India wrap up the series in Mohali under the lights. Report + highlights 👇 #INDvAUS"}
          </p>
        </div>
      </div>
    </div>
  );
}
