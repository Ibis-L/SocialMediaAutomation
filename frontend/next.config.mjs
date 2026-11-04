/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Turbopack — avoids OS inotify file-watch limit panics on Linux
  experimental: {},
  // Allow connections from the local network IP
  allowedDevOrigins: ['192.168.0.195', '192.168.29.185', 'localhost']
};

export default nextConfig;
