"use client";

import React, { useState, useEffect } from "react";
import { Smartphone, Plus, Users, UserPlus, QrCode, X, Trash2, Download, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";

export default function ManageDevicesPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Download APK & Mobile QR state
  const [downloadPageUrl, setDownloadPageUrl] = useState("");
  const [apkDownloadUrl, setApkDownloadUrl] = useState("");
  const [latestVersion, setLatestVersion] = useState("v1.0");
  const [serverHost, setServerHost] = useState("");
  const [detectedIps, setDetectedIps] = useState([]);

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
          if (ipData.ips) setDetectedIps(ipData.ips);

          let resolvedHost = currentHost;
          if (resolvedHost === "localhost" || resolvedHost === "127.0.0.1") {
            resolvedHost = ipData.preferredIp && ipData.preferredIp !== "localhost" ? ipData.preferredIp : resolvedHost;
          }
          if (!resolvedHost || resolvedHost === "localhost" || resolvedHost.startsWith("172.") || resolvedHost === "192.168.0.109") {
            resolvedHost = (ipData.ips && ipData.ips.find(i => /^192\.168\./.test(i.address))?.address) || ipData.preferredIp || (detectedIps[0]?.address || "");
          }
          setServerHost(resolvedHost);

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
  
  // New Device Form State
  const [newDevicePhone, setNewDevicePhone] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);

  // New Contact Form State
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [isAddingContact, setIsAddingContact] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/devices");
      const data = await res.json();
      setDevices(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Failed to fetch devices", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!newDevicePhone) return;
    
    let host = (serverHost || "").trim();
    if (!host || host === "localhost" || host.startsWith("172.") || host === "192.168.0.109") {
      host = (window.location.hostname && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") 
        ? window.location.hostname 
        : (detectedIps.find(i => /^192\.168\./.test(i.address))?.address || detectedIps[0]?.address || "");
    }

    let baseUrl;
    if (window.location.protocol === "https:") {
      baseUrl = `https://${host}`;
    } else {
      baseUrl = `http://${host}:8000`;
    }

    setQrCodeData(JSON.stringify({ url: baseUrl, phone: newDevicePhone.trim(), name: newDeviceName.trim() }));
  };

  // Poll for device registration when QR Code is open
  useEffect(() => {
    let intervalId;
    if (qrCodeData) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch("/api/devices");
          const data = await res.json();
          const devList = Array.isArray(data) ? data : (data.results || []);
          
          // Check if a device with the new phone number has been registered
          if (devList.some(d => d.phone_number === newDevicePhone)) {
            setQrCodeData(null);
            setNewDevicePhone("");
            setNewDeviceName("");
            fetchDevices();
          }
        } catch (e) {
          console.error("Error polling devices", e);
        }
      }, 2000);
    }
    return () => clearInterval(intervalId);
  }, [qrCodeData, newDevicePhone]);

  const handleDeleteDevice = async (e, id) => {
    e.stopPropagation(); // prevent triggering active state selection
    if (!confirm("Are you sure you want to delete this device?")) return;

    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        if (activeDeviceId === id) {
          setActiveDeviceId(null); // Clear selected if deleted
        }
        await fetchDevices();
      } else {
        const errData = await res.json();
        alert("Failed to delete device: " + JSON.stringify(errData));
      }
    } catch (error) {
      alert("Error deleting device.");
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContactPhone || !activeDeviceId) return;
    
    setIsAddingContact(true);
    try {
      const res = await fetch(`/api/devices/${activeDeviceId}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: newContactPhone, name: newContactName })
      });
      
      if (res.ok) {
        setNewContactPhone("");
        setNewContactName("");
        await fetchDevices(); // refresh the list to see new contact
      } else {
        const errData = await res.json();
        alert("Failed to add contact: " + JSON.stringify(errData));
      }
    } catch (error) {
      alert("Error adding contact.");
    } finally {
      setIsAddingContact(false);
    }
  };

  const activeDevice = devices.find(d => d.id === activeDeviceId);

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Devices & Contacts</h1>
        <p className="text-gray-500 mt-1">Register Android devices and manage their specific contact lists.</p>
      </div>

      {/* Step 1: Download & Install APK Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-blue-900/40 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/30">
            <Smartphone size={14} />
            <span>STEP 1: INSTALL DISPATCHER APP</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Get the WhatsApp Automation App
          </h2>
          <p className="text-blue-200/90 text-sm max-w-xl leading-relaxed mb-4">
            Scan this QR code with your mobile camera to open the download page directly on your phone, or click below to download the APK.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={apkDownloadUrl || `${process.env.NEXT_PUBLIC_API_URL || ""}/media/releases/app-debug.apk`}
              download="automation-app.apk"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm active:scale-95"
            >
              <Download size={16} />
              Download APK ({latestVersion})
            </a>
            <Link
              href="/download"
              target="_blank"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition border border-white/20"
            >
              <ExternalLink size={15} />
              Open Download Page
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow-lg text-gray-900 shrink-0 border border-gray-100">
          <div className="bg-white p-1 rounded">
            <QRCodeSVG 
              value={downloadPageUrl || "https://sslocal.in/download"} 
              size={135} 
            />
          </div>
          <span className="text-[11px] font-bold text-gray-800 tracking-wider uppercase mt-2.5">
            Scan to Download APK
          </span>
          <span className="text-[10px] text-gray-500">
            (Use phone camera)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Devices */}
        <div className="flex flex-col gap-6">
          
          {/* QR Code Modal Overlay */}
          {qrCodeData && (() => {
            let parsed = {};
            try { parsed = JSON.parse(qrCodeData); } catch(e) {}
            return (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl p-7 max-w-sm w-full flex flex-col items-center text-center relative border border-gray-100">
                  <button 
                    onClick={() => setQrCodeData(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
                  >
                    <X size={22} />
                  </button>
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-brand-blue mb-3">
                    <QrCode size={26} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Scan with Phone App</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Open the Android Companion App and tap <strong>Scan QR to Connect</strong>.
                  </p>

                  <div className="bg-white p-3 border-2 border-dashed border-gray-200 rounded-xl shadow-inner mb-4">
                    <QRCodeSVG value={qrCodeData} size={210} />
                  </div>

                  <div className="bg-blue-50/80 border border-blue-100 rounded-lg p-3 w-full mb-4 text-left text-xs">
                    <div className="flex justify-between items-center text-gray-500 mb-1">
                      <span>Device Phone:</span>
                      <span className="font-semibold text-gray-800">{parsed.phone || newDevicePhone}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-500">
                      <span>Server URL:</span>
                      <span className="font-mono font-bold text-blue-700 truncate max-w-[170px]">{parsed.url}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-5">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
                    <span>Waiting for phone to scan and pair...</span>
                  </div>

                  <button 
                    onClick={() => setQrCodeData(null)}
                    className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
                  >
                    Close / Done
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Add Device Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-black mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-brand-blue w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              Register & Pair Device
            </h2>
            <form onSubmit={handleAddDevice} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+919876543210"
                    value={newDevicePhone}
                    onChange={(e) => setNewDevicePhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Device Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sales Phone 1"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              {/* Server Host / IP Configuration for Phone */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">Laptop / Server Wi-Fi IP (for Phone)</label>
                  <span className="text-[10px] text-gray-400">Must be reachable by phone</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. 192.168.0.109"
                  value={serverHost}
                  onChange={(e) => setServerHost(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-brand-blue font-mono bg-white"
                />
                {detectedIps && detectedIps.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-gray-500 font-medium">Detected Networks:</span>
                    {detectedIps.map((ip) => (
                      <button
                        key={`${ip.name}-${ip.address}`}
                        type="button"
                        onClick={() => setServerHost(ip.address)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                          serverHost === ip.address
                            ? "bg-blue-100 border-brand-blue text-brand-blue font-bold shadow-xs"
                            : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {ip.name}: {ip.address}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-gray-500 mt-1.5">
                  Ensure phone and laptop are on the same Wi-Fi. This IP is encoded into the QR code so the phone knows where to connect.
                </p>
              </div>

              <button
                type="submit"
                disabled={!newDevicePhone}
                className="w-full py-2.5 bg-brand-blue text-white rounded font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <QrCode size={18} />
                Generate Connection QR
              </button>
            </form>
          </div>

          {/* List of Devices */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-black mb-4">Your Devices</h2>
            <div className="flex flex-col gap-3">
              {loading ? (
                <p className="text-sm text-gray-500 py-4 text-center">Loading devices...</p>
              ) : devices.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No devices registered yet.</p>
              ) : (
                devices.map(device => (
                  <div 
                    key={device.id}
                    onClick={() => setActiveDeviceId(device.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      activeDeviceId === device.id 
                        ? "border-brand-blue bg-blue-50/50 ring-1 ring-brand-blue" 
                        : "border-gray-200 hover:border-brand-blue bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeDeviceId === device.id ? "bg-blue-100 text-brand-blue" : "bg-gray-100 text-gray-500"}`}>
                        <Smartphone size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{device.name || "Unnamed Device"}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                          <span>{device.phone_number}</span>
                          {device.twitter_handle && (
                            <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-sans font-medium text-[11px]">
                              {device.twitter_handle}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-medium text-brand-blue bg-blue-50 px-2 py-1 rounded-full">
                          {device.contacts?.length || 0} Contacts
                        </div>
                        <button 
                          onClick={(e) => handleDeleteDevice(e, device.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Delete Device"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Contacts for selected device */}
        <div className="flex flex-col gap-6">
          {!activeDevice ? (
             <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm flex flex-col items-center justify-center text-gray-400 gap-4 h-full min-h-[400px]">
               <Users size={48} className="opacity-20" />
               <p className="text-center text-sm">Select a device from the left column<br/>to manage its contacts.</p>
             </div>
          ) : (
            <>
              {/* Add Contact Form */}
              <div className="bg-white rounded-xl border border-brand-blue/30 p-6 shadow-sm ring-1 ring-brand-blue/10">
                <h2 className="text-lg font-semibold text-brand-black mb-1 flex items-center gap-2">
                  <UserPlus size={20} className="text-brand-blue" />
                  Add Contact to {activeDevice.name || activeDevice.phone_number}
                </h2>
                <p className="text-xs text-gray-500 mb-4">This contact will only receive messages routed through this specific device.</p>
                <form onSubmit={handleAddContact} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="+919876543210"
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isAddingContact || !newContactPhone}
                    className="w-full py-2.5 bg-brand-black text-white rounded font-medium hover:bg-gray-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Plus size={18} />
                    {isAddingContact ? "Adding..." : "Add Contact"}
                  </button>
                </form>
              </div>

              {/* List of Contacts */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-brand-black mb-4">Device Contacts</h2>
                <div className="flex flex-col gap-2">
                  {(!activeDevice.contacts || activeDevice.contacts.length === 0) ? (
                    <p className="text-sm text-gray-500 py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      No contacts added yet.<br/>Use the form above to add one.
                    </p>
                  ) : (
                    activeDevice.contacts.map(contact => (
                      <div key={contact.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{contact.name || "Unknown Name"}</p>
                          <p className="text-xs text-gray-500 font-mono">{contact.phone_number}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
