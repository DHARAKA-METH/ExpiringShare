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
    <main><form className="card stack" onSubmit={submit}>
      <h1>Sign in</h1>
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      {error && <p className="error">{error}</p>}
      <button disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      <Link href="/signup">Create an account</Link>
    </form></main>
  );
}
