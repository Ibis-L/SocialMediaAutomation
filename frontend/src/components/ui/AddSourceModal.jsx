"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

export default function AddSourceModal({ isOpen, onClose }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    url_identifier: "",
    portal_type: "city_only",
    url_pattern: "",
    selectors: '{\n  "homepage_links": "a",\n  "title": "h1"\n}',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${getApiBaseUrl()}/masters/api/scraper/sources/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          domain: formData.domain,
          url_identifier: formData.url_identifier,
          portal_type: formData.portal_type,
          url_pattern: formData.url_pattern,
          selectors: JSON.parse(formData.selectors || "{}"),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(JSON.stringify(errorData));
      }

      setFormData({ 
        name: "", domain: "", url_identifier: "", 
        portal_type: "city_only", url_pattern: "", 
        selectors: '{\n  "homepage_links": "a",\n  "title": "h1"\n}' 
      });
      onClose();
      // Force next.js to re-fetch Server Components to show the new source instantly!
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="font-heading text-xl">Add New Source</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded border border-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="font-label text-xs tracking-wider uppercase text-gray-500">Source Name</label>
            <input
              type="text"
              required
              className="border p-2 rounded text-sm focus:ring-1 focus:ring-brand-red outline-none"
              placeholder="e.g. Times of India"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label text-xs tracking-wider uppercase text-gray-500">Domain URL</label>
            <input
              type="text"
              required
              className="border p-2 rounded text-sm focus:ring-1 focus:ring-brand-red outline-none"
              placeholder="e.g. timesofindia.indiatimes.com"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label text-xs tracking-wider uppercase text-gray-500">URL Identifier</label>
            <input
              type="text"
              required
              className="border p-2 rounded text-sm focus:ring-1 focus:ring-brand-red outline-none"
              placeholder="e.g. /story/"
              value={formData.url_identifier}
              onChange={(e) => setFormData({ ...formData, url_identifier: e.target.value })}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="font-label text-xs tracking-wider uppercase text-gray-500">Portal Type</label>
              <select
                className="border p-2 rounded text-sm focus:ring-1 focus:ring-brand-red outline-none"
                value={formData.portal_type}
                onChange={(e) => setFormData({ ...formData, portal_type: e.target.value })}
              >
                <option value="city_only">City Based</option>
                <option value="state_only">State Based</option>
                <option value="state_and_city">State + City</option>
              </select>
            </div>
            
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="font-label text-xs tracking-wider uppercase text-gray-500">URL Pattern</label>
              <input
                type="text"
                className="border p-2 rounded text-sm focus:ring-1 focus:ring-brand-red outline-none"
                placeholder="https://bhaskar.com/{state}/{city}/"
                value={formData.url_pattern}
                onChange={(e) => setFormData({ ...formData, url_pattern: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label text-xs tracking-wider uppercase text-gray-500">CSS Selectors (JSON)</label>
            <textarea
              required
              rows="4"
              className="border p-2 rounded text-sm focus:ring-1 focus:ring-brand-red outline-none font-mono"
              value={formData.selectors}
              onChange={(e) => setFormData({ ...formData, selectors: e.target.value })}
            />
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-brand-red text-white rounded hover:brightness-90 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? "Saving..." : "Save Source"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
