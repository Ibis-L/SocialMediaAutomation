import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export const metadata = {
  title: "Twitter (X) Distribution | SS Local",
  description: "Automated Twitter (X) News DMs and Custom Tweet Publishing",
};

export default function TwitterLayout({ children }) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content column */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          breadcrumb="DISTRIBUTION · TWITTER (X)"
          title="Twitter (X) Automation & Distribution"
        />

        {/* Page body */}
        <main className="flex-1 bg-brand-cream flex flex-col px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
