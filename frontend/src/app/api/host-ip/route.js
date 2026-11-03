import { NextResponse } from "next/server";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    // 1. Check if request host header contains a LAN IP (e.g. user visited http://192.168.0.109:3000)
    const hostHeader = request?.headers?.get("host") || "";
    const reqHost = hostHeader.split(":")[0];
    const isReqHostLanIp = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(reqHost) && !/^172\.(17|18|19|20|21|22)\./.test(reqHost);

    // 2. Check environment variable
    const envHostIp = process.env.HOST_IP || process.env.SERVER_HOST;

    const interfaces = os.networkInterfaces();
    const ips = [];

    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          // Exclude docker container internal bridge addresses (typically 172.17.x, 172.18.x)
          const isDockerSubnet = /^172\.(17|18|19|20|21|22)\./.test(net.address);
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

    const preferredIp = envHostIp || (isReqHostLanIp ? reqHost : null) || detectedIp || (ips[0]?.address || "localhost");

    // If ips array is empty (inside Docker container), provide fallback list
    const finalIps = ips.length > 0 ? ips : [
      { name: "Wi-Fi", address: preferredIp }
    ];

    return NextResponse.json({
      preferredIp,
      ips: finalIps,
    });
  } catch (error) {
    return NextResponse.json(
      { preferredIp: "localhost", ips: [], error: error.message },
      { status: 500 }
    );
  }
}
