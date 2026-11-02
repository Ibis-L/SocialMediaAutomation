/**
 * AIAnalysisPanel — shows sentiment, readability delta and SEO score.
 *
 * Props:
 *  - sentiment:    string  e.g. "Neutral"
 *  - readability:  number  e.g. -38 (shown as -38%)
 *  - seoScore:     number  e.g. 86
 *  - seoMax:       number  e.g. 100
 */
export default function AIAnalysisPanel({
  sentiment = "Neutral",
  readability = 0,
  seoScore = 0,
  seoMax = 100,
}) {
  const seoPercent = Math.round((seoScore / seoMax) * 100);

  return (
    <div className="bg-white rounded shadow-sm p-5 flex flex-col gap-4">
      {/* Title */}
      <h3 className="font-heading text-base font-semibold text-brand-black">
        AI Analysis
      </h3>

      {/* Sentiment + Readability row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {/* Sentiment */}
        <div className="bg-gray-50 rounded p-3">
          <p className="font-label text-[8px] tracking-[0.18em] text-gray-400 uppercase mb-2">
            Sentiment
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-active flex-shrink-0" />
            <span className="font-body text-[13px] font-medium text-brand-black">
              {sentiment}
            </span>
          </div>
        </div>

        {/* Readability */}
        <div className="bg-gray-50 rounded p-3">
          <p className="font-label text-[8px] tracking-[0.18em] text-gray-400 uppercase mb-2">
            Readability
          </p>
          <span
            className={`font-body text-[13px] font-semibold ${
              readability >= 0 ? "text-status-active" : "text-brand-red"
            }`}
          >
            {readability >= 0 ? "+" : ""}{readability}%
          </span>
        </div>
      </div>

      {/* SEO Score */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-label text-[9px] tracking-[0.15em] text-gray-500 uppercase">
            SEO Score
          </span>
          <span className="font-label text-[10px] font-semibold text-brand-black">
            {seoScore}/{seoMax}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-status-active rounded-full transition-all duration-500"
            style={{ width: `${seoPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
