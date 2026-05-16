import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "Poker Tracker",
  description: "Track buy-ins, cashouts, and who owes who.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-neutral-800">
          <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight text-lg">
              ♠ Poker Tracker
            </Link>
            <div className="flex gap-4 text-sm text-neutral-300">
              <Link href="/" className="hover:text-white">Dashboard</Link>
              <Link href="/sessions" className="hover:text-white">Sessions</Link>
              <Link href="/players" className="hover:text-white">Players</Link>
            </div>
            <div className="ml-auto">
              <Link
                href="/sessions/new"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-3 py-1.5 rounded"
              >
                + New Session
              </Link>
            </div>
          </nav>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
