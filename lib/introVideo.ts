// lib/introVideo.ts — which encode of the intro video a browser should play.
//
// The <video> lists the VP9 webm first (Chrome, Firefox, Edge play its alpha)
// then the HEVC-with-alpha .mov. WebKit (desktop Safari and every iOS
// browser) also accepts the webm but drops its alpha, so it would play an
// opaque black box and never reach the .mov. Point WebKit at the .mov right
// before the first play instead of reordering the sources: Chrome on a Mac
// with hardware HEVC would then pick the .mov too.

export const INTRO_ALPHA_MOV = '/videos/shah-intro-v2.mov'

export function preferAlphaSource(v: HTMLVideoElement) {
  if (typeof navigator === 'undefined') return
  const ua = navigator.userAgent
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  const safari = /AppleWebKit/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/.test(ua)
  if (!iOS && !safari) return
  if (v.getAttribute('src') === INTRO_ALPHA_MOV || v.currentSrc.endsWith('.mov')) return
  v.src = INTRO_ALPHA_MOV // a src attribute wins over the <source> children
}
