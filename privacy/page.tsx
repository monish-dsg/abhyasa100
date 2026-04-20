export default function Privacy() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
      <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 6 }}>LEGAL</p>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: 24 }}>Privacy Policy</h1>

      <div style={{ fontSize: '0.9375rem', lineHeight: 1.8, color: '#6e6e73' }}>
        <p style={{ marginBottom: 16 }}><strong style={{ color: '#1d1d1f' }}>Last updated:</strong> April 20, 2026</p>

        <p style={{ marginBottom: 16 }}>
          Abhyasa100 is a personal discipline tracking application built and used exclusively by Monish Shah. This privacy policy explains how data is collected and used within this application.
        </p>

        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1d1d1f', marginTop: 28, marginBottom: 12 }}>Data Collection</h2>
        <p style={{ marginBottom: 16 }}>
          This application collects health and fitness data from WHOOP, including sleep metrics, workout activities, step counts, recovery scores, and physiological data. This data is collected solely for personal habit tracking purposes as part of a 100-day discipline challenge.
        </p>

        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1d1d1f', marginTop: 28, marginBottom: 12 }}>Data Usage</h2>
        <p style={{ marginBottom: 16 }}>
          All data collected is used exclusively for personal tracking and self-improvement. Data is stored securely in a private database and is not shared with, sold to, or disclosed to any third parties.
        </p>

        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1d1d1f', marginTop: 28, marginBottom: 12 }}>Data Storage</h2>
        <p style={{ marginBottom: 16 }}>
          Data is stored using Supabase, a secure cloud database platform. Access to the database is restricted to the application owner only.
        </p>

        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1d1d1f', marginTop: 28, marginBottom: 12 }}>WHOOP Integration</h2>
        <p style={{ marginBottom: 16 }}>
          This application connects to WHOOP via the official WHOOP Developer API using OAuth 2.0 authentication. You can revoke access to your WHOOP data at any time through the WHOOP app or by contacting the application owner.
        </p>

        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1d1d1f', marginTop: 28, marginBottom: 12 }}>Contact</h2>
        <p style={{ marginBottom: 16 }}>
          For any questions regarding this privacy policy or your data, please contact Monish Shah, the sole owner and operator of this application.
        </p>
      </div>
    </div>
  )
}
