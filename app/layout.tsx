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
        <nav style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(245,245,247,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <div style={{
            maxWidth: '980px',
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '52px',
          }}>
            <a href="/" style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#1b4332',
              textDecoration: 'none',
              letterSpacing: '-0.03em',
            }}>
              🧘 Abhyasa
            </a>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { href: '/', label: 'Dashboard' },
                { href: '/checkin', label: 'Check-in' },
                { href: '/habits', label: 'Habits' },
                { href: '/yogi', label: 'Yogi' },
                { href: '/photos', label: 'Photos' },
                { href: '/sutras', label: 'Sutras' },
              ].map(link => (
                <a key={link.href} href={link.href} style={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: '#6e6e73',
                  textDecoration: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.04)'
                  e.currentTarget.style.color = '#1d1d1f'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#6e6e73'
                }}
                >
                  {link.label}
                </a>
              ))}
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
