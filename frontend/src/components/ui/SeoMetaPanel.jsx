/**
 * SeoMetaPanel — displays AI-generated SEO metadata (title, meta desc, keywords).
 *
 * Props:
 *  - seoTitle:  string
 *  - metaDesc:  string
 *  - keywords:  string
 */

const ROW = [
  { key: "seoTitle",  label: "SEO TITLE"  },
  { key: "metaDesc",  label: "META DESC"  },
  { key: "keywords",  label: "KEYWORDS"   },
];

export default function SeoMetaPanel({ seoTitle = "", metaDesc = "", keywords = "" }) {
  const values = { seoTitle, metaDesc, keywords };

  return (
    <div className="border-t-[0.3px] border-brand-muted/30 px-6 py-5">
      {/* Heading */}
      <p className="font-label text-[14px] tracking-[0.03em] text-brand-red uppercase mb-5">
        AI-Generated SEO Meta Data
      </p>

      {/* Rows */}
      <div className="flex flex-col">
        {ROW.map(({ key, label }, i) => (
          <div key={key}>
            <div className="grid grid-cols-[150px_1fr] gap-3 items-start py-3">
              <span className="font-label text-[14px] tracking-[0.03em] text-brand-tags uppercase">
                {label}
              </span>
              <span className="font-inter text-[14px] font-normal text-brand-black leading-[18px] tracking-[0.03em] capitalize">
                {values[key]}
              </span>
            </div>
            {i < ROW.length - 1 && (
              <div className="h-px bg-brand-muted/30" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
