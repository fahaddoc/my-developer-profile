// app/tunnel/page.tsx — Step 1 R3F tunnel preview route
//
// Visit /tunnel in dev to test the scroll-driven WebGL tunnel in isolation.
// No portfolio content overlaid yet — pure scene + camera fly-through.

import { TunnelScene } from '@/components/r3f/TunnelScene'

export const metadata = {
  title: 'Tunnel — Step 1',
}

export default function TunnelPreviewPage() {
  return (
    <>
      <TunnelScene />

      {/* Scroll-distance provider — the canvas is fixed, this tall div
          provides the scroll range that drives camera progress. */}
      <div style={{ height: '500vh', position: 'relative', zIndex: 1 }}>
        {/* HUD: progress + scroll hint */}
        <div
          style={{
            position: 'fixed',
            top:      24,
            left:     24,
            color:    '#FFB547',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: 12,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            textShadow: '0 0 8px rgba(255,181,71,0.5)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          ▼ scroll to fly through tunnel
        </div>

        <div
          style={{
            position: 'fixed',
            bottom:   24,
            right:    24,
            color:    'rgba(255,181,71,0.6)',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: 10,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          step 01 · tunnel + camera
        </div>
      </div>
    </>
  )
}
