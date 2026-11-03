import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export const metadata = {
  title: "Facebook Distribution | SS Local",
  description: "Automated Facebook Direct Messaging & Share Link Dispatch",
};

export default function FacebookLayout({ children }) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content column */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          breadcrumb="DISTRIBUTION · FACEBOOK"
          title="Facebook Automation & Distribution"
        />

        {/* Page body */}
        <main className="flex-1 bg-brand-cream flex flex-col px-8 py-6 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

