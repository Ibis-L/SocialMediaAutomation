"use client";

import { useEffect, useState } from "react";
import StatCard from "./StatCard";

export default function DashboardDynamicStats() {
  const [deviceCount, setDeviceCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [devicesRes, tasksRes] = await Promise.all([
          fetch("/api/devices"),
          fetch("/api/tasks")
        ]);
        
        if (devicesRes.ok) {
          const devicesData = await devicesRes.json();
          const devList = Array.isArray(devicesData) ? devicesData : (devicesData.results || []);
          setDeviceCount(devList.length);
        }
        
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          const taskList = Array.isArray(tasksData) ? tasksData : (tasksData.results || []);
          setMessageCount(taskList.length);
        }
      } catch (err) {
        console.error("Error fetching dynamic stats", err);
      }
    };
    
    fetchStats();
    
    // Poll every 10 seconds for real-time updates
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <StatCard
        id="wa-connected"
        label="CONNECTED"
        value={deviceCount.toString()}
        suffix={deviceCount === 1 ? "device" : "devices"}
        valueColor="text-brand-black"
      />
      <StatCard
        id="wa-messages"
        label="MESSAGES · 24H"
        value={messageCount.toString()}
        suffix="sent"
        valueColor="text-brand-blue"
      />
    </>
  );
}
