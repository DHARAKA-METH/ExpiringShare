"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSignedInUser, logoutUser } from "../lib/auth";

export default function HomePage() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    getSignedInUser().then(setUser);
  }, []);

  if (user === undefined) return <main>Loading...</main>;

  return (
    <main>
      <div className="card stack">
        <h1>ExpiringShare</h1>
        <p>Upload a file, set its expiration, and share one secure link.</p>
        {user ? (
          <>
            <Link href="/dashboard">My shares</Link>
            <button className="secondary" onClick={() => logoutUser()}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Sign in</Link>
            <Link href="/signup">Create an account</Link>
          </>
        )}
      </div>
    </main>
  );
}
