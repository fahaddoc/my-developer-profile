'use client'

// Shared scroll rails for the tunnel pages:
//   • TunnelAnchors — invisible <div id="…"> targets at each station's t:
//                     hash links and the no-Lenis fallback of scrollToStation.
// Used by both `/` (TunnelMode) and `/tunnel` (preview).
//
// There is deliberately no automatic loop back to the start: on a trackpad
// the momentum tail reached the bottom and teleported visitors to the intro.
// The HUD finale offers "Back to the start" instead.

import { STATIONS } from '@/lib/tunnel'

// Must match <main height:500vh> (AppShell TunnelMode, app/tunnel/page.tsx):
// the scrollable range is 500vh - 100vh = 400vh, so progress = scrollY / 400vh.
const SCROLLABLE_VH = 400

// Each anchor sits exactly at its station's t. They used to sit at t - 0.03,
// which left a rail click 0.03 short of the station and the overlay stuck at
// ~68% opacity. TunnelHUD's scrollToStation now reads t directly; these
// anchors are the no-Lenis / hash-link fallback and must agree with it.
const ANCHORS = STATIONS.map(({ id, t }) => ({ id, topVh: t * SCROLLABLE_VH }))

export function TunnelAnchors() {
  return (
    <>
      {ANCHORS.map(({ id, topVh }) => (
        <div
          key={id}
          id={id}
          style={{
            position: 'absolute',
            top: `${topVh}vh`,
            left: 0, right: 0,
            height: 1,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
      ))}
    </>
  )
}
