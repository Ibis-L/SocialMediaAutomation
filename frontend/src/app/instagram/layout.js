import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export const metadata = {
  title: "Instagram Distribution | SS Local",
  description: "Automated Instagram DM & News Sharing",
};

export default function InstagramLayout({ children }) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content column */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          breadcrumb="DISTRIBUTION · INSTAGRAM"
          title="Instagram Automation & Distribution"
        />

        {/* Page body */}
        <main className="flex-1 bg-brand-cream flex flex-col px-8 py-6 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

