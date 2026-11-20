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
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <div className="mb-8"><Link className="text-sm font-bold text-indigo-600" href="/dashboard">← Back to dashboard</Link><p className="mb-2 mt-6 text-sm font-bold uppercase tracking-widest text-indigo-600">New share</p><h1 className="text-4xl font-black tracking-tight text-slate-950">Upload a file</h1><p className="mt-2 text-slate-500">Create a link with exactly the access rules you need.</p></div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <div className="card p-6 sm:p-8">
      <form className="stack" onSubmit={submit}>
        <label className="cursor-pointer rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50"><span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white">↑</span><span className="block font-bold text-slate-800">Choose a file to upload</span><span className="mt-1 block text-sm text-slate-500">PDF, PNG, JPG, or TXT · Maximum 10 MB</span><input className="sr-only" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required /></label>
        {file && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><strong>{file.name}</strong><span className="ml-2">{Math.ceil(file.size / 1024)} KB</span></div>}
        <label className="text-sm font-bold text-slate-700">Expires after<select className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3" value={expiryHours} onChange={(e) => setExpiryHours(Number(e.target.value))}>
          <option value="1">1 hour</option><option value="24">24 hours</option><option value="168">7 days</option>
        </select></label>
        <label className="text-sm font-bold text-slate-700">Maximum downloads<select className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3" value={String(maxDownloads)} onChange={(e) => setMaxDownloads(e.target.value === "null" ? null : Number(e.target.value))}>
          <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="5">5</option><option value="null">Unlimited</option>
        </select></label>
        {error && <p className="error">{error}</p>}
        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={["creating", "uploading", "completing"].includes(status)}>
          {status === "creating" ? "Preparing..." : status === "uploading" ? "Uploading..." : status === "completing" ? "Finalizing..." : "Create share link"}
       </button>
      </form>
      </div>
      <aside className="card h-fit space-y-5 p-6 sm:p-8"><h2 className="text-lg font-black text-slate-900">Your link settings</h2><div className="space-y-4 text-sm"><div><p className="font-bold text-slate-700">Automatic expiration</p><p className="mt-1 text-slate-500">The link stops working after your selected time.</p></div><div><p className="font-bold text-slate-700">Download protection</p><p className="mt-1 text-slate-500">Limit how many times recipients can download the file.</p></div><div><p className="font-bold text-slate-700">Private upload</p><p className="mt-1 text-slate-500">Files upload directly to encrypted S3 storage.</p></div></div></aside>
      </div>
      {shareUrl && <div className="card mt-6 border-emerald-200 bg-emerald-50 p-6">
        <p className="font-black text-emerald-800">✓ Your file is ready to share</p>
        <div className="mt-4 flex gap-2"><input className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" value={shareUrl} readOnly /><button className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700" type="button" onClick={copyLink}>Copy</button></div>
        <Link className="mt-4 inline-block font-bold text-emerald-800" href={shareUrl}>Open share page →</Link>
      </div>}
    </main>
  );
}
