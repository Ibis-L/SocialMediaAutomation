"use client";

import { useState, useEffect } from "react";
import { Battery, BatteryCharging, Thermometer, Clock, Smartphone, Activity, RefreshCw } from "lucide-react";

export default function DeviceMonitoringPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const fetchDevices = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await fetch(`/api/devices?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDevices(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) {
      console.error("Error fetching devices:", err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setTimeout(() => setRefreshing(false), 500); // Give user a tiny bit of visual feedback
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(() => fetchDevices(false), 10000);
    return () => clearInterval(interval);
  }, []);

  const getBatteryIcon = (level, status) => {
    if (status === "Charging") return <BatteryCharging className="text-green-500 w-5 h-5" />;
    if (level > 20) return <Battery className="text-brand-black w-5 h-5" />;
    return <Battery className="text-brand-red w-5 h-5" />;
  };

  const getStatusIndicator = (lastHeartbeat) => {
    if (!lastHeartbeat) return <span className="flex w-3 h-3 rounded-full bg-gray-400" title="Offline"></span>;
    
    const diff = new Date() - new Date(lastHeartbeat);
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return <span className="flex w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" title="Online"></span>;
    if (seconds < 300) return <span className="flex w-3 h-3 rounded-full bg-yellow-500" title="Away"></span>;
    return <span className="flex w-3 h-3 rounded-full bg-red-500" title="Offline"></span>;
  };

  const formatLastSeen = (lastHeartbeat) => {
    if (!lastHeartbeat) return "Never";
    
    const diff = new Date() - new Date(lastHeartbeat);
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-lg font-semibold text-brand-black flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-blue" />
            Device Health Monitoring
          </h2>
          <p className="text-sm text-gray-500 mt-1">Real-time status, battery, and temperature of all connected WhatsApp devices.</p>
        </div>
        <button 
          onClick={() => fetchDevices(true)}
          disabled={refreshing}
          className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium transition-all shadow-sm
            ${refreshing ? 'opacity-70 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50 active:scale-95'}`}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-blue' : 'text-gray-500'}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Now'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6 bg-gray-50/30">
        {loading && devices.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400">Loading devices...</div>
        ) : devices.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 flex flex-col items-center">
            <Smartphone className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-base font-medium text-gray-600">No devices connected</p>
            <p className="text-sm">Connect a device to monitor its health.</p>
          </div>
        ) : (
          devices.map((device) => (
            <div key={device.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Smartphone className="w-6 h-6 text-brand-blue" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{device.name || "Unknown Device"}</h3>
                    <p className="text-sm text-gray-500">{device.phone_number}</p>
                  </div>
                </div>
                <div className="pt-2">
                  {getStatusIndicator(device.last_heartbeat)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    {getBatteryIcon(device.battery_level, device.battery_status)}
                    Battery
                  </div>
                  <div className="text-lg font-medium text-gray-900 mt-1">
                    {device.battery_level != null ? `${device.battery_level}%` : "N/A"}
                  </div>
                  <div className="text-xs text-gray-400">{device.battery_status || "Unknown"}</div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase font-semibold tracking-wider">
                    <Thermometer className="text-orange-500 w-4 h-4" />
                    Temp
                  </div>
                  <div className="text-lg font-medium text-gray-900 mt-1">
                    {device.temperature != null ? `${device.temperature}°C` : "N/A"}
                  </div>
                  <div className="text-xs text-gray-400">Device Heat</div>
                </div>
              </div>
              
              <div className="mt-5 pt-3 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                Last seen: {formatLastSeen(device.last_heartbeat)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
