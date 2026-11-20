"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmUser } from "../../lib/auth";

export default function ConfirmPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setEmail(sessionStorage.getItem("pendingEmail") || ""), []);

  async function submit(event) {
    event.preventDefault();
    setError("");

    try {
      await confirmUser(email, code);
      sessionStorage.removeItem("pendingEmail");
      router.push("/login");
    } catch (err) {
      setError(err.message || "Confirmation failed.");
    }
  }

  return (
    <main><form className="card stack" onSubmit={submit}>
      <h1>Confirm email</h1>
      <p>Enter the code sent to your email.</p>
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Confirmation code<input value={code} onChange={(e) => setCode(e.target.value)} required /></label>
      {error && <p className="error">{error}</p>}
      <button>Confirm account</button>
    </form></main>
  );
}
