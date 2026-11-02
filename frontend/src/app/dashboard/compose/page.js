"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Smartphone, Send, CheckCircle2, Users, RefreshCw, Download, QrCode, X, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { getApiBaseUrl } from "@/lib/api";

export default function ComposePage() {
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  // Download APK modal and release state
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadPageUrl, setDownloadPageUrl] = useState("");
  const [apkDownloadUrl, setApkDownloadUrl] = useState("");
  const [latestVersion, setLatestVersion] = useState("v1.0");

  useEffect(() => {
    let currentHost = "localhost";
    if (typeof window !== "undefined") {
      currentHost = window.location.hostname;
      setDownloadPageUrl(`${window.location.origin}/download`);
    }

    async function fetchHostIpAndRelease() {
      try {
        const ipRes = await fetch("/api/host-ip");
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          let resolvedHost = currentHost;
          if (resolvedHost === "localhost" || resolvedHost === "127.0.0.1") {
            resolvedHost = ipData.preferredIp && ipData.preferredIp !== "localhost" ? ipData.preferredIp : resolvedHost;
          }
          if (typeof window !== "undefined") {
            const port = window.location.port ? `:${window.location.port}` : "";
            setDownloadPageUrl(`${window.location.protocol}//${resolvedHost}${port}/download`);
          }
        }
      } catch (err) {
        console.error("Failed to fetch host IP:", err);
      }

      try {
        const res = await fetch("/api/app-versions/latest");
        if (res.ok) {
          const data = await res.json();
          if (data.apk_file) setApkDownloadUrl(data.apk_file);
          if (data.version_name) setLatestVersion(`v${data.version_name}`);
        }
      } catch (err) {
        console.error("Failed to fetch release info:", err);
      }
    }
    fetchHostIpAndRelease();
  }, []);
  
  const [selectedNewsIds, setSelectedNewsIds] = useState([]);
  
  // Which device is currently being viewed in the 3rd column
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  
  // Map of deviceId -> array of selected contact phone numbers
  const [selectedContacts, setSelectedContacts] = useState({});
  
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  
  const handleNewsToggle = (id) => {
    setSelectedNewsIds(prev => {
      if (prev.includes(id)) return prev.filter(nId => nId !== id);
      return [...prev, id];
    });
  };

  const [approvedNews, setApprovedNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [refreshingNews, setRefreshingNews] = useState(false);

  const fetchApprovedNews = useCallback(async (isManual = false) => {
    if (isManual) setRefreshingNews(true);
    try {
      const newsRes = await fetch(
        `${getApiBaseUrl()}/masters/api/editor/article/?status=APPROVED`,
        { cache: "no-store" }
      );
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        const items = Array.isArray(newsData) ? newsData : (newsData.results || []);
        const formattedNews = items.map(n => ({
          id: n.id,
          headline: n.title || (typeof n.content === 'object' && n.content?.title) || "No Title",
          summary: n.seo_desc || (n.edited_content ? n.edited_content.substring(0, 140) + '...' : (typeof n.content === 'string' ? n.content.substring(0, 140) + '...' : (n.content?.body_content ? n.content.body_content.substring(0, 140) + '...' : 'No summary available.'))),
          url: n.source_url
        }));
        setApprovedNews(formattedNews);
      } else {
        console.error("Failed to fetch approved news:", newsRes.status);
        setApprovedNews([]);
      }
    } catch (err) {
      console.error("Failed to fetch approved news", err);
      setApprovedNews([]);
    } finally {
      setLoadingNews(false);
      setRefreshingNews(false);
    }
  }, []);

  const fetchDevicesList = useCallback(async () => {
    try {
      const devRes = await fetch("/api/devices", { cache: "no-store" });
      if (devRes.ok) {
        const devData = await devRes.json();
        setDevices(Array.isArray(devData) ? devData : (devData.results || []));
      } else {
        setDevices([]);
      }
    } catch (err) {
      console.error("Failed to fetch devices", err);
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovedNews();
    fetchDevicesList();

    // Auto-refresh news queue every 15 seconds so approved editorial articles show up dynamically
    const interval = setInterval(() => {
      fetchApprovedNews();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchApprovedNews, fetchDevicesList]);


  const handleContactToggle = (deviceId, contactPhone) => {
    setSelectedContacts(prev => {
      const devContacts = prev[deviceId] || [];
      if (devContacts.includes(contactPhone)) {
        return { ...prev, [deviceId]: devContacts.filter(p => p !== contactPhone) };
      } else {
        return { ...prev, [deviceId]: [...devContacts, contactPhone] };
      }
    });
  };

  const handleSelectAllContacts = (deviceId, allContacts) => {
    setSelectedContacts(prev => {
      const devContacts = prev[deviceId] || [];
      if (devContacts.length === allContacts.length) {
        // Deselect all
        return { ...prev, [deviceId]: [] };
      } else {
        // Select all
        return { ...prev, [deviceId]: allContacts.map(c => c.phone_number) };
      }
    });
  };

  const activeDevice = devices.find(d => d.id === activeDeviceId);
  const activeDeviceContacts = activeDevice?.contacts || [];
  const selectedForActive = selectedContacts[activeDeviceId] || [];
  
  const totalSelectedContactsCount = Object.values(selectedContacts).reduce((acc, curr) => acc + curr.length, 0);

  const handleSend = async () => {
    if (selectedNewsIds.length === 0 || totalSelectedContactsCount === 0) {
      alert("Please select at least one news article and one contact.");
      return;
    }

    setIsSending(true);
    setSendSuccess(false);

    // Format message with actual news content
    const messageParts = [`*📰 Latest News Updates*`];
    selectedNewsIds.forEach(id => {
      const news = approvedNews.find(n => n.id === id);
      if (news) {
        messageParts.push(``, `*${news.headline}*`);
        if (news.summary) messageParts.push(news.summary);
        if (news.url) messageParts.push(`Read more: ${news.url}`);
      }
    });
    const message = messageParts.join("\n");

    // Format tasks for the backend
    const tasks = [];
    Object.entries(selectedContacts).forEach(([deviceId, phones]) => {
      phones.forEach(phone => {
        tasks.push({
          device_id: parseInt(deviceId),
          contact_number: phone,
          message
        });
      });
    });

    try {
      const response = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks })
      });

      const data = await response.json();
      if (response.ok || data.success) {
        setSendSuccess(true);
        // Clear selections
        setSelectedContacts({});
        setTimeout(() => setSendSuccess(false), 3000);
      } else {
        alert("Failed to queue tasks: " + (data.error || data.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error sending tasks:", error);
      alert("Error queuing tasks. Is the backend running?");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Distribution</h1>
          <p className="text-gray-500 mt-1">Select news, choose devices, and distribute to your contacts.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDownloadModal(true)}
            className="py-2.5 px-4 rounded-lg font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm"
          >
            <QrCode size={16} className="text-brand-blue" />
            Download App (QR)
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || selectedNewsIds.length === 0 || totalSelectedContactsCount === 0}
            className={`py-2.5 px-6 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
              sendSuccess
                ? "bg-green-500 text-white"
                : selectedNewsIds.length === 0 || totalSelectedContactsCount === 0
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-brand-blue text-white hover:bg-blue-700 shadow-md active:scale-95"
            }`}
          >
            {isSending ? "Queueing..." : sendSuccess ? "Queued!" : `Send to ${totalSelectedContactsCount} Contacts`}
          </button>
        </div>
      </div>

      {/* Download APK Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-7 max-w-sm w-full flex flex-col items-center text-center relative border border-gray-100">
            <button 
              onClick={() => setShowDownloadModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X size={22} />
            </button>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-brand-blue mb-3">
              <Smartphone size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Download Automation App</h3>
            <p className="text-xs text-gray-500 mb-5">Scan this QR code with your phone camera to download the Android APK.</p>
            
            <div className="bg-white p-3 border border-gray-200 rounded-xl shadow-inner mb-4">
              <QRCodeSVG 
                value={downloadPageUrl || "https://sslocal.in/download"} 
                size={170} 
              />
            </div>
            
            <span className="text-xs font-semibold text-gray-700 mb-4 bg-gray-100 px-3 py-1 rounded-full">
              Release: {latestVersion}
            </span>

            <div className="flex flex-col gap-2.5 w-full">
              <a
                href={apkDownloadUrl || `${process.env.NEXT_PUBLIC_API_URL || ""}/media/releases/app-debug.apk`}
                download="automation-app.apk"
                className="w-full py-2.5 bg-brand-blue text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm shadow-sm"
              >
                <Download size={16} />
                Download APK Directly
              </a>
              <Link
                href="/dashboard/manage-devices"
                onClick={() => setShowDownloadModal(false)}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-xs"
              >
                Go to Manage Devices & Pair Phone →
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start h-[700px]">
        {/* Column 1: Editorial News Queue */}
        <div className="flex flex-col gap-4 h-full bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-black flex items-center gap-2">
              <span className="bg-blue-100 text-brand-blue w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              Select News
            </h2>
            <button
              onClick={() => fetchApprovedNews(true)}
              disabled={loadingNews || refreshingNews}
              title="Refresh approved news"
              className="p-1.5 rounded-lg text-gray-500 hover:text-brand-blue hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshingNews ? "animate-spin text-brand-blue" : ""} />
            </button>
          </div>
          
          <div className="flex flex-col gap-3 overflow-y-auto pr-2 pb-2">
            {loadingNews ? (
              <p className="text-sm text-gray-500 text-center py-8">Loading approved news...</p>
            ) : approvedNews.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No approved news available.</p>
            ) : (
              approvedNews.map((news) => (
                <div
                  key={news.id}
                  onClick={() => handleNewsToggle(news.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col gap-2 ${
                  selectedNewsIds.includes(news.id) 
                    ? "border-brand-blue bg-blue-50/50 shadow-sm ring-1 ring-brand-blue" 
                    : "border-gray-200 bg-white hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-medium text-brand-black leading-snug">{news.headline}</h3>
                  {selectedNewsIds.includes(news.id) && <CheckCircle2 size={18} className="text-brand-blue shrink-0 ml-2" />}
                </div>
                <span className="text-xs text-gray-500 line-clamp-2">{news.summary}</span>
              </div>
            )))}
          </div>
        </div>

        {/* Column 2: Connected Devices */}
        <div className="flex flex-col gap-4 h-full bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-hidden">
          <h2 className="text-lg font-semibold text-brand-black flex items-center gap-2">
            <span className="bg-blue-100 text-brand-blue w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
            Select Device
          </h2>
          
          <div className="flex flex-col gap-3 overflow-y-auto pr-2 pb-2">
            {loadingDevices ? (
              <p className="text-sm text-gray-500 text-center py-8">Loading devices...</p>
            ) : devices.length === 0 ? (
              <div className="text-center py-8 px-3 flex flex-col items-center gap-3">
                <Smartphone size={32} className="text-gray-300" />
                <p className="text-sm font-medium text-gray-700">No devices connected</p>
                <p className="text-xs text-gray-400 max-w-xs">
                  Install the Android automation app to dispatch WhatsApp updates from this dashboard.
                </p>
                <div className="flex flex-col gap-2 w-full mt-2">
                  <button
                    onClick={() => setShowDownloadModal(true)}
                    className="py-2 px-3 bg-brand-blue text-white rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center justify-center gap-1.5 transition"
                  >
                    <QrCode size={14} />
                    Scan QR to Download App
                  </button>
                  <Link
                    href="/dashboard/manage-devices"
                    className="py-1.5 px-3 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition text-center"
                  >
                    Manage & Pair Devices →
                  </Link>
                </div>
              </div>
            ) : (
              devices.map((device) => {
                const selectedCount = selectedContacts[device.id]?.length || 0;
                return (
                  <div 
                    key={device.id}
                    onClick={() => setActiveDeviceId(device.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      activeDeviceId === device.id 
                        ? "border-brand-blue bg-blue-50/50 shadow-sm ring-1 ring-brand-blue" 
                        : "border-gray-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeDeviceId === device.id ? "bg-blue-100 text-brand-blue" : "bg-gray-100 text-gray-500"}`}>
                        <Smartphone size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{device.name || "Unnamed Device"}</p>
                        <p className="text-xs text-gray-500 font-mono">{device.phone_number}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-between items-center text-xs">
                      <span className="text-gray-500">{device.contacts?.length || 0} Total Contacts</span>
                      {selectedCount > 0 && (
                        <span className="font-medium text-brand-blue bg-blue-50 px-2 py-0.5 rounded-full">{selectedCount} Selected</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Column 3: Contacts for Active Device */}
        <div className="flex flex-col gap-4 h-full bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-hidden">
          <h2 className="text-lg font-semibold text-brand-black flex items-center gap-2">
            <span className="bg-blue-100 text-brand-blue w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
            Select Contacts
          </h2>
          
          {!activeDevice ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Users size={48} className="opacity-20" />
              <p className="text-sm text-center">Click a device in the middle column<br/>to view its contacts.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-700">{activeDevice.name} Contacts</span>
                {activeDeviceContacts.length > 0 && (
                  <button 
                    onClick={() => handleSelectAllContacts(activeDevice.id, activeDeviceContacts)}
                    className="text-xs text-brand-blue hover:underline font-medium"
                  >
                    {selectedForActive.length === activeDeviceContacts.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>
              
              <div className="flex flex-col gap-2 overflow-y-auto pr-2 pb-2">
                {activeDeviceContacts.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No contacts for this device.</p>
                ) : (
                  activeDeviceContacts.map(contact => {
                    const isSelected = selectedForActive.includes(contact.phone_number);
                    return (
                      <div 
                        key={contact.id} 
                        onClick={() => handleContactToggle(activeDevice.id, contact.phone_number)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? "border-brand-blue bg-blue-50/30" : "border-gray-100 hover:bg-gray-50"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                          isSelected ? "bg-brand-blue border-brand-blue" : "border-gray-300 bg-white"
                        }`}>
                          {isSelected && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{contact.name || "No Name"}</p>
                          <p className="text-xs text-gray-500 font-mono">{contact.phone_number}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
