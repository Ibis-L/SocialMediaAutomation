"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import DashboardTabs from "@/components/ui/DashboardTabs";
import DashboardDynamicStats from "@/components/ui/DashboardDynamicStats";
import { CustomerProvider } from "@/context/CustomerContext";

const DEVICE_TABS = [
  { href: "/dashboard/manage-devices",  label: "Manage Devices" },
  { href: "/dashboard/queue",           label: "Message Queue" },
  { href: "/dashboard/monitoring",      label: "Device Health" },
  { href: "/dashboard/app-releases",    label: "App Releases" },
];

const YOUTUBE_TABS = [
  { href: "/dashboard/youtube",            label: "Add Video to Library" },
  { href: "/dashboard/youtube/distribute", label: "Distribute to Devices" },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  const isWhatsApp = pathname.startsWith("/dashboard/compose");
  const isYouTube = pathname.startsWith("/dashboard/youtube");
  const isDevices = pathname.startsWith("/dashboard/manage-devices") ||
                    pathname.startsWith("/dashboard/queue") ||
                    pathname.startsWith("/dashboard/monitoring") ||
                    pathname.startsWith("/dashboard/app-releases");

  let headerTitle = "Dashboard";
  let headerBreadcrumb = "PORTAL · OVERVIEW";

  if (isWhatsApp) {
    headerTitle = "WhatsApp Distribution";
    headerBreadcrumb = "DISTRIBUTION · WHATSAPP";
  } else if (isYouTube) {
    headerTitle = "YouTube Distribution";
    headerBreadcrumb = "DISTRIBUTION · YOUTUBE";
  } else if (isDevices) {
    headerTitle = "Device & Infrastructure Hub";
    headerBreadcrumb = "INFRASTRUCTURE · DEVICES";
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Page Header */}
        <Header
          breadcrumb={headerBreadcrumb}
          title={headerTitle}
        />

        {/* Page body */}
        <main className="flex-1 bg-brand-cream flex flex-col">
          {/* ── Stats Row (displayed for WhatsApp and Device Hub) ── */}
          {(isWhatsApp || isDevices) && (
            <section
              id="wa-stats-row"
              className="flex gap-4 px-8 pt-7 pb-3"
              aria-label="Distribution statistics"
            >
              <DashboardDynamicStats />
            </section>
          )}

          {/* ── Tab Navigation (Devices Hub) ── */}
          {isDevices && (
            <div className="px-8 pt-2">
              <DashboardTabs tabs={DEVICE_TABS} />
            </div>
          )}

          {/* ── Tab Navigation (YouTube Hub: Add Video, Distribute) ── */}
          {isYouTube && (
            <div className="px-8 pt-2">
              <DashboardTabs tabs={YOUTUBE_TABS} />
            </div>
          )}

          {/* ── Tab / Page Content ── */}
          <div className="flex-1 px-8 py-6">
            <CustomerProvider>
              {children}
            </CustomerProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
