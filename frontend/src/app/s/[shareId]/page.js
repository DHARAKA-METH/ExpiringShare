"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { requestDownload } from "../../../lib/api";
import Spinner from "../../../components/Spinner";

export default function SharePage() {
  const { shareId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    try {
      setLoading(true);
      setError("");
      const data = await requestDownload(shareId);
      window.location.href = data.downloadUrl;
    } catch (err) {
      setError(err.message || "This share is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center px-6 py-12"><div className="card w-full max-w-lg p-8 text-center sm:p-10">
    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-100 text-3xl text-indigo-600">↓</div>
    <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">ExpiringShare</p><h1 className="mt-3 text-3xl font-black text-slate-950">A file was shared with you</h1>
    <p className="mt-3 text-slate-500">This link is temporary and protected by expiration and download limits.</p>
    {error && <p className="error mt-6 rounded-xl bg-red-50 p-3 text-sm">{error}</p>}
    <button className="mt-8 w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={download} disabled={loading}>{loading ? <Spinner label="Preparing download..." /> : "Download file"}</button>
  </div></main>;
}
