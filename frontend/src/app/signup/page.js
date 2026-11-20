"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "../../lib/auth";
import Spinner from "../../components/Spinner";

export default function SignupPage() {
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
      await registerUser(email, password);
      sessionStorage.setItem("pendingEmail", email);
      router.push("/confirm");
    } catch (err) {
      setError(err.message || "Sign-up failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main><form className="card stack" onSubmit={submit}>
      <h1>Create account</h1>
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      {error && <p className="error">{error}</p>}
      <button className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>{loading ? <Spinner label="Creating account..." /> : "Create account"}</button>
      <Link href="/login">Already have an account?</Link>
    </form></main>
  );
}
