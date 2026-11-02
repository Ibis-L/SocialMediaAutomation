"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, ShieldCheck, ArrowRight } from "lucide-react";

export default function DownloadAppPage() {
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatestRelease() {
      try {
        // Need to proxy this through Next.js if cors is an issue, 
        // but for now let's just fetch from the django backend directly or via proxy.
        // I'll create a Next.js proxy route for /api/app-versions/latest to be safe.
        const res = await fetch("/api/app-versions/latest");
        if (res.ok) {
          const data = await res.json();
          setRelease(data);
        }
      } catch (err) {
        console.error("Failed to fetch latest release", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLatestRelease();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-brand-blue p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Smartphone className="text-white w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">WhatsApp Auto-Dispatcher</h1>
          <p className="text-blue-100 text-sm">
            The background automation engine for your news portal.
          </p>
        </div>

        <div className="p-8 flex flex-col items-center">
          {loading ? (
            <div className="animate-pulse flex flex-col items-center gap-4 w-full">
              <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : !release ? (
            <div className="text-center py-4 w-full flex flex-col items-center">
              <span className="bg-blue-100 text-brand-blue font-mono text-xs px-3 py-1 rounded-full font-bold mb-3">
                Latest Build v1.0
              </span>
              <p className="text-gray-600 text-sm mb-6">
                Download the official WhatsApp Auto-Dispatcher APK for Android.
              </p>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || ""}/media/releases/app-debug.apk`}
                download="automation-app.apk"
                className="w-full bg-brand-blue hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Download className="w-5 h-5" />
                Download APK (v1.0)
              </a>
              <div className="mt-6 flex flex-col gap-2 w-full text-center">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  Secure direct download from server
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Since this app uses Accessibility Services for automation, it must be side-loaded directly. 
                  Go to Settings {'>'} Security {'>'} Install Unknown Apps to allow.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="w-full mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Version</span>
                  <span className="bg-green-100 text-green-700 font-mono text-sm px-2.5 py-0.5 rounded-full font-bold">
                    v{release.version_name}
                  </span>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mt-4 text-left">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Release Notes</h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {release.release_notes || "Bug fixes and performance improvements."}
                  </p>
                </div>
              </div>

              <a
                href={release.apk_file}
                download
                className="w-full bg-brand-blue hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Download className="w-5 h-5" />
                Download APK
              </a>
              
              <div className="mt-6 flex flex-col gap-2 w-full text-center">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  Secure direct download from server
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Since this app uses Accessibility Services for automation, it must be side-loaded directly. 
                  Go to Settings {'>'} Security {'>'} Install Unknown Apps to allow.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
