"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * DashboardTabs — reusable tab navigation bar with active state via usePathname.
 *
 * Props:
 *  - tabs: { href: string, label: string }[]
 */
export default function DashboardTabs({ tabs = [] }) {
  const pathname = usePathname();

  return (
    <div className="flex items-end gap-0 border-b border-gray-200 px-6">
      {tabs.map((tab) => {
        const isActive = pathname.replace(/\/$/, "") === tab.href.replace(/\/$/, "");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            id={`tab-${tab.label.toLowerCase().replace(/\s+/g, "-")}`}
            className={`
              font-inter text-[16px] px-4 py-2.5 transition-colors duration-150 whitespace-nowrap
              ${
                isActive
                  ? "text-brand-black font-semibold border-b-2 border-brand-red -mb-px"
                  : "text-gray-400 font-semibold hover:text-gray-600"
              }
            `}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
