import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Abhyasa100 — Monish Shah',
  description: '100 Day Discipline Challenge',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <nav className="nav-wrap">
          <div className="nav-inner">
            <a href="/" className="nav-logo">🧘 Abhyasa</a>
            <div className="nav-links">
              <a href="/" className="nav-link">Home</a>
              <a href="/checkin" className="nav-link">Add</a>
              <a href="/habits" className="nav-link">Habits</a>
              <a href="/yogi" className="nav-link">Yogi</a>
              <a href="/photos" className="nav-link">Photos</a>
              <a href="/sutras" className="nav-link">Sutras</a>
            </div>
          </div>
        </nav>
        <main style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 40px' }}>{children}</main>
      </body>
    </html>
  )
}
