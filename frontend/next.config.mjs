/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Turbopack — avoids OS inotify file-watch limit panics on Linux
  experimental: {},
  // Allow connections from the local network IP and production domain
  allowedDevOrigins: ['192.168.0.195', '192.168.29.185', 'localhost', 'sslocal.mediatechtemple.com'],
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    return [
      {
        source: '/masters/:path*',
        destination: `${backendUrl}/masters/:path*`,
      },
    ];
  },
};

export default nextConfig;
