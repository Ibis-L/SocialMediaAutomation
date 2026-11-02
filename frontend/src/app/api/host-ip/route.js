import { NextResponse } from "next/server";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    // 1. Check if request host header contains a public domain or LAN host
    const hostHeader = request?.headers?.get("x-forwarded-host") || request?.headers?.get("host") || "";
    const reqHost = hostHeader.split(":")[0];
    const isLocalhost = !reqHost || reqHost === "localhost" || reqHost === "127.0.0.1";
    const isDockerInternal = /^172\.(1[7-9]|2\d|3[01])\./.test(reqHost);
    const validReqHost = (!isLocalhost && !isDockerInternal) ? reqHost : null;

    // 2. Check environment variable
    const envHostIp = process.env.HOST_IP || process.env.SERVER_HOST;

    const interfaces = os.networkInterfaces();
    const ips = [];

    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          // Exclude docker container internal bridge addresses (typically 172.17.x - 172.22.x)
          const isDockerSubnet = /^172\.(1[7-9]|2\d|3[01])\./.test(net.address);
          if (!isDockerSubnet) {
            ips.push({
              name,
              address: net.address,
            });
          }
        }
      }
    }

    const wifiIp = ips.find((i) => /wi-?fi|wlan/i.test(i.name));
    const ethernetIp = ips.find((i) => /ethernet|eth/i.test(i.name) && !/vEthernet|tailscale|docker/i.test(i.name));
    const standardLanIp = ips.find((i) => /^192\.168\./.test(i.address));
    const private10Ip = ips.find((i) => /^10\./.test(i.address) && !/tailscale/i.test(i.name));

    // Choose best candidate
    const detectedIp = wifiIp?.address || standardLanIp?.address || ethernetIp?.address || private10Ip?.address || ips[0]?.address;

    const preferredIp = envHostIp || validReqHost || detectedIp || "localhost";

    // If ips array is empty (inside Docker container), provide fallback list
    const finalIps = ips.length > 0 ? ips : [
      { name: "Host", address: preferredIp }
    ];

    return NextResponse.json({
      preferredIp,
      ips: finalIps,
    });
  } catch (error) {
    return NextResponse.json(
      { preferredIp: "localhost", ips: [{ name: "Host", address: "localhost" }], error: error.message },
      { status: 500 }
    );
  }
}
