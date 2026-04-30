import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 30% 30%, #2e1065 0%, #0a0a0f 70%), linear-gradient(135deg, #1a0b2e 0%, #0a0a0f 100%)',
          color: '#a855f7',
          fontWeight: 800,
          fontSize: 110,
          letterSpacing: -6,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textShadow: '0 0 20px rgba(168,85,247,0.6)',
        }}
      >
        SF
      </div>
    ),
    { ...size }
  )
}
