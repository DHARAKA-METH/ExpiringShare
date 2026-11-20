import "./globals.css";
import "../lib/amplify";

export const metadata = {
  title: "ExpiringShare",
  description: "Share files with expiration and download limits",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
