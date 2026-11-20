"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSignedInUser, logoutUser } from "../../lib/auth";
import { listMyShares } from "../../lib/api";
import { getShareUrl } from "../../lib/shareUrl";

function formatDate(timestamp) {
  if (!timestamp) return "Not activated";
  return new Date(timestamp * 1000).toLocaleString();
}

export default function DashboardPage() {
  const router = useRouter();
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const user = await getSignedInUser();
        if (!user) {
          router.replace("/login");
          return;
        }

        const result = await listMyShares();
        setShares(result.shares || []);
      } catch (err) {
        setError(err.message || "Could not load your shares.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function copyShare(shareUrl) {
    await navigator.clipboard.writeText(getShareUrl(shareUrl));
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-sm font-bold uppercase tracking-widest text-indigo-600">Workspace</p><h1 className="text-4xl font-black tracking-tight text-slate-950">My shares</h1><p className="mt-2 text-slate-500">Manage every file and link from one place.</p></div>
        <Link className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700" href="/upload">+ Upload file</Link>
      </div>
      <div className="card stack p-5 sm:p-7">

        {loading && <p>Loading your uploaded files...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && shares.length === 0 && (
          <p>You have not uploaded any files yet.</p>
        )}

        {shares.map((share) => {
          const url = getShareUrl(share.shareUrl);
          const limited = share.maxDownloads !== null;

          return (
            <article className="rounded-2xl border border-slate-200 p-5 transition hover:border-indigo-200 hover:shadow-md" key={share.shareId}>
              <div className="flex flex-wrap items-start justify-between gap-4"><div><strong className="block text-lg text-slate-900">{share.fileName}</strong><span className="mt-1 block text-sm text-slate-500">Expires {formatDate(share.expiresAt)}</span></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${share.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : share.status === "EXPIRED" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}>{share.status}</span></div>
              <div className="mt-5 text-sm text-slate-600">
                Downloads: {share.downloadCount} / {limited ? share.maxDownloads : "Unlimited"}
              </div>
              {share.status === "ACTIVE" && (
                <>
                  <div className="mt-4 flex gap-2">
                    <input className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" value={url} readOnly />
                    <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700" type="button" onClick={() => copyShare(share.shareUrl)}>
                      Copy
                    </button>
                  </div>
                  <Link className="mt-3 inline-block text-sm font-bold text-indigo-600 hover:text-indigo-800" href={url}>Open share page →</Link>
                </>
              )}
            </article>
          );
        })}

        <button className="secondary" onClick={() => logoutUser().then(() => router.push("/login"))}>
          Sign out
        </button>
      </div>
    </main>
  );
}
