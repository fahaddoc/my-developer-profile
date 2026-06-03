// app/tunnel/page.tsx — standalone tunnel preview
// Shares the same TunnelHUD overlay used by the main /

'use client'

import { TunnelScene } from '@/components/r3f/TunnelScene'
import { TunnelHUD }   from '@/components/r3f/TunnelHUD'
import { TunnelAnchors, useTunnelLoop } from '@/components/r3f/TunnelScrollRails'

export default function TunnelPreviewPage() {
  useTunnelLoop()

  return (
    <>
      <TunnelScene />
      <TunnelHUD />

      <main style={{ height: '500vh', position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
        <TunnelAnchors />
      </main>

      <div
        style={{
          position: 'fixed',
          bottom:   24,
          right:    24,
          color:    'rgba(94,234,212,0.45)',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 10,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
          zIndex: 50,
        }}
      >
        preview · /tunnel
      </div>
    </>
  )
}
