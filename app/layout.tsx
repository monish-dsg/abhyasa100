import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Abhyasa100', description: '100 Week Discipline Challenge' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav-wrap">
          <div className="nav-inner">
            <a href="/" className="nav-logo">🧘 Abhyasa</a>
            <div className="nav-links">
              <a href="/" className="nav-link">Home</a>
              <a href="/checkin" className="nav-link">Add</a>
              <a href="/habits" className="nav-link">Habits</a>
              <a href="/yogi" className="nav-link">Yogi</a>
              <a href="/sutras" className="nav-link">Sutras</a>
            </div>
          </div>
        </nav>
        <main style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 40px' }}>{children}</main>
      </body>
    </html>
  )
}
