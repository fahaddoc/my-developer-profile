import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '404 — Lost in space',
  robots: { index: false, follow: false },
}

// Lightweight, theme-aware 404 (no WebGL) — matches the site's dark/glass look
// via the same CSS variables the rest of the site uses.
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px',
        background:
          'radial-gradient(900px 600px at 50% 0%, rgba(94,234,212,0.10), transparent 60%), rgb(var(--bg-base))',
        color: 'rgb(var(--text-primary))',
        fontFamily: 'var(--font-body), system-ui, sans-serif',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 12,
          letterSpacing: '0.3em',
          color: 'rgb(var(--accent-cyan))',
          marginBottom: 16,
        }}
      >
        SIGNAL LOST
      </div>

      <h1
        style={{
          fontFamily: 'var(--font-display), sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(72px, 18vw, 160px)',
          lineHeight: 0.9,
          letterSpacing: '-0.04em',
          margin: 0,
        }}
      >
        4<span style={{ color: 'rgb(var(--accent-cyan))' }}>0</span>4
      </h1>

      <p
        style={{
          marginTop: 18,
          maxWidth: 420,
          fontSize: 15,
          lineHeight: 1.6,
          color: 'rgb(var(--text-secondary))',
        }}
      >
        This page drifted out of the space. The coordinates don&apos;t map to
        anything in orbit.
      </p>

      <div style={{ display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, rgb(var(--accent-cyan)), #38bdf8)',
            color: '#05070d',
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          ← Back to the space
        </Link>
        <Link
          href="/#projects"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '12px 24px',
            borderRadius: 999,
            border: '1px solid rgb(var(--accent-cyan) / 0.4)',
            color: 'rgb(var(--text-primary))',
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          View work
        </Link>
      </div>
    </main>
  )
}
