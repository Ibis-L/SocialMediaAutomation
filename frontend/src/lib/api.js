/**
 * Resolves the appropriate backend API base URL depending on runtime environment.
 * 
 * - If NEXT_PUBLIC_API_URL is explicitly defined (and not localhost in production), use it.
 * - In a browser environment outside localhost / 127.0.0.1 (e.g. deployed to production / behind Ingress),
 *   defaults to window.location.origin so requests are routed via the same public domain / reverse proxy.
 * - In local development or SSR fallback, defaults to process.env.NEXT_PUBLIC_API_URL or 'http://localhost:8000'.
 */
export function getApiBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes("localhost:8000")) {
    return envUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return window.location.origin;
    }
  }

  return (envUrl || "http://localhost:8000").replace(/\/+$/, "");
}
