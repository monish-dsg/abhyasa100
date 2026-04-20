import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Abhyasa100 — Monish Shah',
  description: '100 Day Discipline Challenge',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(11,11,11,0.85)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
            <a href="/" className="nav-logo">⌚ Abhyasa</a>
            <div style={{ display: 'flex', gap: 4 }}>
              <a href="/" className="nav-link">Dashboard</a>
              <a href="/checkin" className="nav-link">Check-in</a>
              <a href="/habits" className="nav-link">Habits</a>
              <a href="/yogi" className="nav-link">Yogi</a>
              <a href="/photos" className="nav-link">Photos</a>
              <a href="/sutras" className="nav-link">Sutras</a>
            </div>
          </div>
        </nav>
        <main style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px' }}>{children}</main>
      </body>
    </html>
  )
}
