"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSignedInUser } from "../lib/auth";

export default function HomePage() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    getSignedInUser().then(setUser);
  }, []);

  if (user === undefined) return <main>Loading...</main>;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
      <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <section className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
            <span className="h-2 w-2 rounded-full bg-indigo-600" /> Secure file sharing
          </div>
          <h1 className="max-w-2xl text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">
            Share files with confidence.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-slate-600">
            Upload a file, choose how long it should live, and send one simple link that expires automatically.
          </p>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <Link className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700" href="/dashboard">
                Open dashboard
              </Link>
            ) : (
              <Link className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700" href="/signup">
                Get started free
              </Link>
            )}
            <Link className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700" href={user ? "/upload" : "/login"}>
              {user ? "Upload a file" : "Sign in"}
            </Link>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-slate-500">
            <span>✓ Expiring links</span><span>✓ Download limits</span><span>✓ Direct S3 upload</span>
          </div>
        </section>
        <section className="card relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-100" />
          <div className="relative space-y-5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-950">Your secure workspace</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Protected</span>
            </div>
            <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-2xl text-white">↑</div>
              <p className="font-bold text-slate-800">Drop a file to create a link</p>
              <p className="mt-1 text-sm text-slate-500">Control expiration and downloads</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Expiration</p><p className="mt-1 font-bold">24 hours</p></div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Downloads</p><p className="mt-1 font-bold">3 allowed</p></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
