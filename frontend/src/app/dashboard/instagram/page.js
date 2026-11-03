"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardInstagramRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/instagram");
  }, [router]);

  return (
    <div className="flex items-center justify-center p-12 text-gray-500 text-sm">
      <span>Redirecting to dedicated Instagram section...</span>
    </div>
  );
}

