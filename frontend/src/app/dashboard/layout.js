import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import DashboardTabs from "@/components/ui/DashboardTabs";
import DashboardDynamicStats from "@/components/ui/DashboardDynamicStats";
import { CustomerProvider } from "@/context/CustomerContext";
import { Globe, Edit3, MessageSquare, ListTodo, Activity, FileUp, Settings } from "lucide-react";

const navigation = [
  { name: "Scraping Status", href: "/dashboard", icon: Globe },
  { name: "Content Editor", href: "/dashboard/editor", icon: Edit3 },
  { name: "WhatsApp Compose", href: "/dashboard/compose", icon: MessageSquare },
  { name: "Message Queue", href: "/dashboard/queue", icon: ListTodo },
  { name: "Live Devices", href: "/dashboard/monitoring", icon: Activity },
  { name: "App Releases", href: "/dashboard/app-releases", icon: FileUp },
  { name: "System Settings", href: "/dashboard/settings", icon: Settings },
];

const TABS = [
  { href: "/dashboard/compose",         label: "Compose (WhatsApp)" },
  { href: "/dashboard/manage-devices",  label: "Manage Devices" },
  { href: "/dashboard/queue",           label: "Message Queue" },
  { href: "/dashboard/monitoring",      label: "Device Health" },
  { href: "/dashboard/app-releases",    label: "App Releases" },
];

/**
 * Dashboard shared layout — persists Header, Stats Row, and Tab navigation
 * across all /dashboard/* child pages. Only {children} re-renders on route change.
 */
export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar — reused from existing layout */}
      <Sidebar />

      {/* Main content column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Page Header — reused Header component */}
        <Header
          breadcrumb="DISTRIBUTION · MESSAGING"
          title="WhatsApp Distribution"
        />

        {/* Page body */}
        <main className="flex-1 bg-brand-cream flex flex-col">
          {/* ── Stats Row — reused StatCard component ── */}
          <section
            id="wa-stats-row"
            className="flex gap-4 px-8 pt-7 pb-5"
            aria-label="WhatsApp distribution statistics"
          >
            <DashboardDynamicStats />
          </section>

          {/* ── Tab Navigation — reused DashboardTabs ── */}
          <div className="px-8">
            <DashboardTabs tabs={TABS} />
          </div>

          {/* ── Tab Content — only this re-renders on route change ── */}
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
