import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Abhyasa100 — Monish Shah',
  description: '100 Day Discipline Challenge',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-green-900 text-white px-6 py-4 flex gap-6 text-sm font-medium">
          <a href="/" className="hover:text-green-300">Dashboard</a>
          <a href="/checkin" className="hover:text-green-300">Check-in</a>
          <a href="/habits" className="hover:text-green-300">Habits</a>
          <a href="/yogi" className="hover:text-green-300">Yogi</a>
          <a href="/photos" className="hover:text-green-300">Photos</a>
          <a href="/sutras" className="hover:text-green-300">Yoga Sutras</a>
        </nav>
        <main className="max-w-5xl mx-auto p-6">{children}</main>
      </body>
    </html>
  )
}
