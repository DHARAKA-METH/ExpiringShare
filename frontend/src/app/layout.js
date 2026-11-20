import "./globals.css";
import "../lib/amplify";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "ExpiringShare",
  description: "Share files with expiration and download limits",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased"><Navbar />{children}</body>
    </html>
  );
}
