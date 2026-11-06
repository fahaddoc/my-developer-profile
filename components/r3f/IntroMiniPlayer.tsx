'use client'

// IntroMiniPlayer — retired. The intro video now plays in place of the hero
// portrait (components/r3f/PortraitIntro.tsx, inside FlipPhotoCard), so there
// is no separate player box on desktop. The export stays so TunnelHUD still
// compiles until it drops the <IntroMiniPlayer /> mount; it renders nothing.

export function IntroMiniPlayer() {
  return null
}
