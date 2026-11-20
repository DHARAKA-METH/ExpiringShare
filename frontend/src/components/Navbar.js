"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSignedInUser, logoutUser } from "../lib/auth";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    getSignedInUser().then(setUser);
  }, [pathname]);

  async function signOut() {
    await logoutUser();
    setUser(null);
    setUserMenuOpen(false);
    setMenuOpen(false);
    router.push("/");
  }

  const links = user
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/upload", label: "Upload file" },
      ]
    : [];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-950"
          onClick={() => setMenuOpen(false)}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg text-white shadow-md shadow-indigo-600/20">
            ◈
          </span>
          ExpiringShare
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-indigo-200"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((open) => !open)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">
                  {(user.username || "U").slice(0, 1).toUpperCase()}
                </span>
                Account <span aria-hidden="true">⌄</span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-12 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <p className="truncate px-3 py-2 text-xs text-slate-500">{user.username}</p>
                  <Link className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" href="/dashboard" onClick={() => setUserMenuOpen(false)}>My shares</Link>
                  <button className="w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50" onClick={signOut}>Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link className="text-sm font-bold text-slate-600 hover:text-indigo-700" href="/login">Sign in</Link>
              <Link className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700" href="/signup">Get started</Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-xl border border-slate-200 p-2 text-xl text-slate-700 md:hidden"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "×" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-6 py-4 md:hidden">
          <nav className="grid gap-2" aria-label="Mobile navigation">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-xl px-3 py-3 font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700" onClick={() => setMenuOpen(false)}>{link.label}</Link>
            ))}
            {user ? (
              <button className="rounded-xl px-3 py-3 text-left font-bold text-red-600 hover:bg-red-50" onClick={signOut}>Sign out</button>
            ) : (
              <div className="grid gap-2 border-t border-slate-100 pt-3"><Link href="/login" className="rounded-xl px-3 py-3 font-bold text-slate-700" onClick={() => setMenuOpen(false)}>Sign in</Link><Link href="/signup" className="rounded-xl bg-indigo-600 px-3 py-3 text-center font-bold text-white" onClick={() => setMenuOpen(false)}>Get started</Link></div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
