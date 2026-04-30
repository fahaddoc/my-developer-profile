import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a0b2e 0%, #0a0a0f 100%)',
          color: '#a855f7',
          fontWeight: 800,
          fontSize: 38,
          letterSpacing: -2,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          borderRadius: 12,
          boxShadow: 'inset 0 0 0 2px rgba(168,85,247,0.5)',
        }}
      >
        SF
      </div>
    ),
    { ...size }
  )
}
