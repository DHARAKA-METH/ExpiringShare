"use client";

import { useEffect, useState } from "react";

export default function CopyButton({ value }) {
  const [state, setState] = useState("idle");

  useEffect(() => {
    if (state === "idle") return undefined;

    const timer = window.setTimeout(() => setState("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
        type="button"
        onClick={copy}
        aria-label={state === "copied" ? "Share link copied" : "Copy share link"}
      >
        {state === "copied" ? "✓ Copied" : state === "failed" ? "Copy failed" : "Copy"}
      </button>
      {state === "copied" && <span className="text-xs font-bold text-emerald-600" role="status">Copied to clipboard</span>}
      {state === "failed" && <span className="text-xs font-bold text-red-600" role="status">Please copy the link manually</span>}
    </span>
  );
}
