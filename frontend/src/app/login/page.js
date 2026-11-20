"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await loginUser(email, password);
      router.push("/upload");
    } catch (err) {
      setError(err.message || "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12"><form className="card w-full max-w-md space-y-6 p-8" onSubmit={submit}>
      <div><Link className="text-sm font-bold text-indigo-600" href="/">ExpiringShare</Link><h1 className="mt-6 text-3xl font-black text-slate-950">Welcome back</h1><p className="mt-2 text-slate-500">Sign in to manage your secure links.</p></div>
      <div className="space-y-4"><label className="block text-sm font-bold text-slate-700">Email<input className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label className="block text-sm font-bold text-slate-700">Password<input className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label></div>
      {error && <p className="error rounded-xl bg-red-50 p-3 text-sm">{error}</p>}
      <button className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      <p className="text-center text-sm text-slate-500">New to ExpiringShare? <Link className="font-bold text-indigo-600" href="/signup">Create an account</Link></p>
    </form></main>
  );
}
