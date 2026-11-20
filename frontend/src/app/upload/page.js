"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSignedInUser } from "../../lib/auth";
import { completeUpload, createUpload, uploadToS3 } from "../../lib/api";
import { getShareUrl } from "../../lib/shareUrl";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [expiryHours, setExpiryHours] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState(3);
  const [status, setStatus] = useState("idle");
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getSignedInUser().then((user) => {
      if (!user) router.replace("/login");
    });
  }, [router]);

  async function submit(event) {
    event.preventDefault();
    if (!file) return setError("Choose a file first.");

    try {
      setError("");
      setShareUrl("");
      setStatus("creating");

      const upload = await createUpload(file, { expiryHours, maxDownloads });
      setStatus("uploading");
      await uploadToS3(upload.uploadUrl, file);
      setStatus("completing");
      const completed = await completeUpload(upload.shareId);

      setShareUrl(getShareUrl(completed.shareUrl));
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err.message || "Upload failed.");
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
  }

  return (
    <main><div className="card stack">
      <h1>Upload a file</h1>
      <form className="stack" onSubmit={submit}>
        <label>File<input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required /></label>
        <label>Expires after<select value={expiryHours} onChange={(e) => setExpiryHours(Number(e.target.value))}>
          <option value="1">1 hour</option><option value="24">24 hours</option><option value="168">7 days</option>
        </select></label>
        <label>Maximum downloads<select value={String(maxDownloads)} onChange={(e) => setMaxDownloads(e.target.value === "null" ? null : Number(e.target.value))}>
          <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="5">5</option><option value="null">Unlimited</option>
        </select></label>
        {file && <p>{file.name} ({Math.ceil(file.size / 1024)} KB)</p>}
        {error && <p className="error">{error}</p>}
        <button disabled={["creating", "uploading", "completing"].includes(status)}>
          {status === "creating" ? "Preparing..." : status === "uploading" ? "Uploading..." : status === "completing" ? "Finalizing..." : "Create share link"}
        </button>
      </form>
      {shareUrl && <div className="stack">
        <p className="success">Your file is ready to share.</p>
        <div className="linkbox"><input value={shareUrl} readOnly /><button type="button" onClick={copyLink}>Copy</button></div>
        <Link href={shareUrl}>Open share page</Link>
      </div>}
    </div></main>
  );
}
