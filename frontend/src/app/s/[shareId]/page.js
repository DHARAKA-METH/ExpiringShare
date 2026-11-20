"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { requestDownload } from "../../../lib/api";

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

  return <main><div className="card stack">
    <h1>ExpiringShare file</h1>
    <p>This file is available through a temporary download link.</p>
    {error && <p className="error">{error}</p>}
    <button onClick={download} disabled={loading}>{loading ? "Preparing download..." : "Download file"}</button>
  </div></main>;
}
