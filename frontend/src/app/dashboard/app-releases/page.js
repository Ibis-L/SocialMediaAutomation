"use client";

import React, { useState } from "react";
import { UploadCloud, CheckCircle2, ShieldCheck, Download } from "lucide-react";
import Link from "next/link";

export default function AppReleasesPage() {
  const [versionCode, setVersionCode] = useState("");
  const [versionName, setVersionName] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [isMandatory, setIsMandatory] = useState(true);
  const [file, setFile] = useState(null);
  
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !versionCode || !versionName) {
      setError("Please fill out all required fields and select an APK file.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("version_code", parseInt(versionCode));
      formData.append("version_name", versionName);
      formData.append("release_notes", releaseNotes);
      formData.append("is_mandatory", isMandatory);
      formData.append("apk_file", file);

      const res = await fetch("/api/app-versions", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        // Reset form
        setVersionCode("");
        setVersionName("");
        setReleaseNotes("");
        setFile(null);
      } else {
        setError("Failed to upload: " + (data.error || JSON.stringify(data)));
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage App Updates</h1>
          <p className="text-gray-500 mt-1">Upload new versions of the WhatsApp Automation Android App.</p>
        </div>
        <Link 
          href="/download" 
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 bg-brand-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Go to Download Page
        </Link>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <span className="font-medium">Successfully published! Devices will now prompt to download this update.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleUpload} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 flex flex-col gap-5 border-b border-gray-100">
          
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version Name</label>
              <input 
                type="text" 
                placeholder="e.g. 1.0.5" 
                value={versionName}
                onChange={e => setVersionName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version Code (Internal Integer)</label>
              <input 
                type="number" 
                placeholder="e.g. 5" 
                value={versionCode}
                onChange={e => setVersionCode(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Release Notes</label>
            <textarea 
              rows="3"
              placeholder="What's new in this version?" 
              value={releaseNotes}
              onChange={e => setReleaseNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">APK File</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-brand-blue hover:bg-blue-50/30 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept=".apk"
                onChange={e => setFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required
              />
              <div className="space-y-1 text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <span className="relative rounded-md font-medium text-brand-blue hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-blue">
                    {file ? file.name : "Upload a file"}
                  </span>
                  <p className="pl-1">{!file && "or drag and drop"}</p>
                </div>
                <p className="text-xs text-gray-500">app-release.apk up to 50MB</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox" 
              id="mandatory" 
              checked={isMandatory}
              onChange={e => setIsMandatory(e.target.checked)}
              className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue"
            />
            <label htmlFor="mandatory" className="text-sm font-medium text-gray-700">Force Mandatory Update</label>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            File is served securely over local network
          </p>
          <button 
            type="submit" 
            disabled={uploading}
            className="px-6 py-2 bg-brand-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {uploading ? "Publishing Update..." : "Publish OTA Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
