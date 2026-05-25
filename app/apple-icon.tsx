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
            'radial-gradient(circle at 30% 30%, #25212e 0%, #0a0a0f 72%), linear-gradient(135deg, #1a1822 0%, #0a0a0f 100%)',
          color: '#b4a5c8',
          fontWeight: 700,
          fontSize: 108,
          letterSpacing: -5,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        SF
      </div>
    ),
    { ...size }
  )
}
