// app/tunnel/page.tsx — standalone tunnel preview
// Shares the same TunnelHUD overlay used by the main /

'use client'

import { TunnelScene } from '@/components/r3f/TunnelScene'
import { TunnelHUD }   from '@/components/r3f/TunnelHUD'

export default function TunnelPreviewPage() {
  return (
    <>
      <TunnelScene />

      <div style={{ height: '500vh', position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
        <TunnelHUD />

        <div
          style={{
            position: 'fixed',
            bottom:   24,
            right:    24,
            color:    'rgba(255,181,71,0.45)',
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
      </div>
    </>
  )
}
