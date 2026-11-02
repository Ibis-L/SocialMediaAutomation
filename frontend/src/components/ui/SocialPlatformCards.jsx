"use client";

const FILE_MAP = {
  facebook: 'facebook.jpeg',
  instagram: 'instagram.jpeg',
  twitter: 'twitter.png',
  linkedin: 'linkedin.png',
  telegram: 'telegram.jpeg',
  youtube: 'youtube.png',
};

/**
 * SocialPlatformCards — row of 6 social media platform cards.
 * Each shows icon, name, account count, status dot, and Connect/Manage button.
 *
 * Props:
 *  - platforms: { id, name, accounts, color, status, icon }[]
 */
export default function SocialPlatformCards({ platforms = [] }) {
  return (
    <div className="flex gap-3">
      {platforms.map((p) => {
        const isActive = p.status === "active";
        const fileName = FILE_MAP[p.id];

        // Instagram uses a custom gradient in Figma
        const bgStyle = p.id === 'instagram' 
          ? { background: 'linear-gradient(140.87deg, rgba(118,42,202,0.73) 7.35%, rgba(201,16,181,0.87) 31.79%, rgba(241,16,159,0.74) 47.9%, rgba(187,153,0,0.68) 67.15%, rgba(247,114,27,0.84) 86.86%)' }
          : { backgroundColor: p.color };

        return (
          <div
            key={p.id}
            id={`platform-${p.id}`}
            className="bg-brand-card border border-brand-border rounded p-4 flex flex-col items-start gap-2 flex-1 min-w-0 relative h-[137px]"
          >
            {/* Status dot */}
            <div
              className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: isActive ? "#0B7225" : "#D9D9D9" }}
            />

            {/* Platform icon */}
            <div
              className="w-[34px] h-[34px] rounded flex items-center justify-center text-white overflow-hidden flex-shrink-0"
              style={bgStyle}
            >
              {/* Uses a local image file from the public directory */}
              <img 
                src={`/icons/${fileName}`} 
                alt={`${p.name} icon`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if the image hasn't been downloaded yet
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <span className="font-label text-[10px] font-bold hidden">{p.icon}</span>
            </div>

            {/* Name + accounts */}
            <div>
              <p className="font-inter text-[16px] font-medium text-brand-black leading-[18px] mb-0.5">{p.name}</p>
              <p className="font-inter text-[10px] font-medium text-[#727272]">{p.accounts} accounts</p>
            </div>

            {/* Action button */}
            <button
              className="w-full py-1.5 border-[0.3px] border-[#727272] rounded-sm font-label text-[10px] tracking-[0.03em] uppercase text-[#727272] hover:bg-gray-50 transition-colors mt-auto"
            >
              {isActive ? "Manage" : "Connect"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
