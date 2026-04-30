import { ImageResponse } from 'next/og'
import { AUTHOR } from '@/lib/seo/site'

export const runtime = 'edge'
export const alt = `${AUTHOR.name} — ${AUTHOR.jobTitle}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background:
            'radial-gradient(ellipse at top left, #2e1065 0%, #0a0a0f 55%), linear-gradient(135deg, #0a0a0f 0%, #1a0b2e 100%)',
          color: '#f1f5f9',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              background: '#22c55e',
              boxShadow: '0 0 20px #22c55e',
            }}
          />
          <span style={{ fontSize: 22, color: '#22c55e', letterSpacing: 2, textTransform: 'uppercase' }}>
            Available for opportunities
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 140,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -4,
              display: 'flex',
              alignItems: 'flex-end',
            }}
          >
            Shah Fahad
            <span style={{ color: '#a855f7', textShadow: '0 0 30px #a855f7' }}>.</span>
          </div>
          <div
            style={{
              fontSize: 36,
              color: '#22d3ee',
              letterSpacing: 6,
              textTransform: 'uppercase',
              textShadow: '0 0 20px #22d3ee',
            }}
          >
            Senior Software Engineer
          </div>
          <div style={{ fontSize: 28, color: '#cbd5e1', maxWidth: 900, lineHeight: 1.4 }}>
            Real-time web & mobile · React · Next.js · Flutter · WebRTC · SignalR
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 22, color: '#94a3b8' }}>Karachi, Pakistan</span>
          <span style={{ fontSize: 22, color: '#a855f7' }}>shahfahad.dev</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
