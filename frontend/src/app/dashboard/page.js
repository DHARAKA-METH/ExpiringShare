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
    <main>
      <div className="card stack">
        <div className="linkbox">
          <h1 style={{ marginRight: "auto" }}>My shares</h1>
          <Link href="/upload">Upload file</Link>
        </div>

        {loading && <p>Loading your uploaded files...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && shares.length === 0 && (
          <p>You have not uploaded any files yet.</p>
        )}

        {shares.map((share) => {
          const url = getShareUrl(share.shareUrl);
          const limited = share.maxDownloads !== null;

          return (
            <article className="card stack" key={share.shareId}>
              <strong>{share.fileName}</strong>
              <span>Status: {share.status}</span>
              <span>Expires: {formatDate(share.expiresAt)}</span>
              <span>
                Downloads: {share.downloadCount} / {limited ? share.maxDownloads : "Unlimited"}
              </span>
              {share.status === "ACTIVE" && (
                <>
                  <div className="linkbox">
                    <input value={url} readOnly />
                    <button type="button" onClick={() => copyShare(share.shareUrl)}>
                      Copy
                    </button>
                  </div>
                  <Link href={url}>Open share page</Link>
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
