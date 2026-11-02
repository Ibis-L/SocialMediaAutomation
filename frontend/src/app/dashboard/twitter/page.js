"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardTwitterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/twitter");
  }, [router]);

  return (
    <div className="flex items-center justify-center p-12 text-gray-500 text-sm">
      <span>Redirecting to dedicated Twitter (X) section...</span>
    </div>
  );
}
