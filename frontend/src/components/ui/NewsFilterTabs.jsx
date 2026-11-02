"use client";

/**
 * NewsFilterTabs — horizontal tab strip with count badges.
 *
 * Props:
 *  - tabs:      { key, label, count }[]
 *  - activeTab: string  (key)
 *  - onTabChange: (key: string) => void
 */
export default function NewsFilterTabs({ tabs = [], activeTab, onTabChange }) {
  return (
    <div className="border-b border-gray-200 px-6">
      <div className="flex items-end gap-0">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              onClick={() => onTabChange(tab.key)}
              className={`
                relative flex items-center gap-1.5 font-label text-[10px] tracking-wider
                px-4 py-3 transition-colors duration-150 whitespace-nowrap
                ${
                  isActive
                    ? "text-brand-black border-b-2 border-brand-black -mb-px"
                    : "text-gray-400 hover:text-gray-600 border-b-2 border-transparent -mb-px"
                }
              `}
            >
              {tab.label}
              <span
                className={`
                  font-label text-[9px] px-1.5 py-0.5 rounded-full leading-none
                  ${
                    isActive
                      ? "bg-brand-red text-white"
                      : "bg-gray-100 text-gray-400"
                  }
                `}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
