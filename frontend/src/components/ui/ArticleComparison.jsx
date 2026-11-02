/**
 * ArticleComparison — side-by-side original vs AI-rewritten article text panel.
 *
 * Props:
 *  - original:  string
 *  - rewritten: string
 */
export default function ArticleComparison({ original = "", rewritten = "", onChangeRewritten }) {
  return (
    <div className="grid grid-cols-2">
      {/* Left: Original */}
      <div className="border-r border-brand-border flex flex-col">
        {/* Tab header */}
        <div className="flex items-center gap-2 px-5 py-1.5 bg-brand-warm border border-brand-border">
          <span className="w-2 h-2 rounded-full bg-[#938B7C]" />
          <span className="font-label text-[12px] tracking-[0.03em] text-[#938B7C] uppercase">
            Original · Scraped
          </span>
        </div>
        {/* Content */}
        <div className="bg-brand-card border-x border-b border-brand-border px-6 py-5 flex-1">
          <div className="font-heading text-[14px] font-normal text-brand-black leading-[24px] tracking-[0.03em] capitalize whitespace-pre-line">
            {original}
          </div>
        </div>
      </div>

      {/* Right: AI Rewritten */}
      <div className="flex flex-col">
        {/* Tab header */}
        <div className="flex items-center gap-2 px-5 py-1.5 bg-[#F3F3ED] border-y border-r border-brand-border">
          <span className="w-2 h-2 rounded-full bg-brand-green" />
          <span className="font-label text-[12px] tracking-[0.03em] text-brand-green uppercase">
            AI Rewritten · Humanized + SEO
          </span>
        </div>
        {/* Content */}
        <div className="bg-[#F3F3ED] border-r border-b border-brand-border px-6 py-5 flex-1 flex flex-col">
          {onChangeRewritten ? (
            <textarea
              className="flex-1 w-full bg-transparent border-none resize-y font-heading text-[14px] font-normal text-brand-black leading-[24px] tracking-[0.03em] focus:outline-none min-h-[300px]"
              value={rewritten}
              onChange={(e) => onChangeRewritten(e.target.value)}
              placeholder="Start editing the AI rewritten text manually..."
            />
          ) : (
            <div className="font-heading text-[14px] font-normal text-brand-black leading-[24px] tracking-[0.03em] capitalize whitespace-pre-line">
              {rewritten}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
