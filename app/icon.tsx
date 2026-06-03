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
          background: 'linear-gradient(135deg, #1a1822 0%, #0a0a0f 100%)',
          color: '#b4a5c8',
          fontWeight: 700,
          fontSize: 36,
          letterSpacing: -1.5,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          borderRadius: 14,
          border: '1.5px solid rgba(180,165,200,0.28)',
        }}
      >
        SF
      </div>
    ),
    { ...size }
  )
}
