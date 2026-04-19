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
      <body style={{ background: '#f5f5f7', minHeight: '100vh' }}>
        <style>{`
          .nav-wrap {
            position: sticky;
            top: 0;
            z-index: 50;
            background: rgba(245,245,247,0.72);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(0,0,0,0.06);
          }
          .nav-inner {
            max-width: 980px;
            margin: 0 auto;
            padding: 0 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 52px;
          }
          .nav-logo {
            font-size: 1.125rem;
            font-weight: 700;
            color: #1b4332;
            text-decoration: none;
            letter-spacing: -0.03em;
          }
          .nav-links { display: flex; gap: 4px; }
          .nav-link {
            font-size: 0.8125rem;
            font-weight: 500;
            color: #6e6e73;
            text-decoration: none;
            padding: 6px 12px;
            border-radius: 8px;
            transition: all 0.2s ease;
          }
          .nav-link:hover {
            background: rgba(0,0,0,0.04);
            color: #1d1d1f;
          }
        `}</style>
        <nav className="nav-wrap">
          <div className="nav-inner">
            <a href="/" className="nav-logo">🧘 Abhyasa</a>
            <div className="nav-links">
              <a href="/" className="nav-link">Dashboard</a>
              <a href="/checkin" className="nav-link">Check-in</a>
              <a href="/habits" className="nav-link">Habits</a>
              <a href="/yogi" className="nav-link">Yogi</a>
              <a href="/photos" className="nav-link">Photos</a>
              <a href="/sutras" className="nav-link">Sutras</a>
            </div>
          </div>
        </nav>
        <main style={{ maxWidth: '980px', margin: '0 auto', padding: '32px 24px' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
