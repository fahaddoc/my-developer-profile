// app/page.tsx — slim boot shell.
//
// <AppShell> (sections, R3F, detect-gpu, …) lives behind a next/dynamic
// boundary and mounts on the first frame. On the first visit of a session
// <LoadingScreen> plays ABOVE it as an overlay: the app downloads, hydrates
// and draws its first frame underneath, and the card crossfades out once
// AppShell reports ready (capped, see LoadingScreen). Until AppShell's chunk
// arrives its loading fallback is the loader's last frame (BootFrame), so
// there is never an empty frame, with or without the card.
//
// On the screens that get MobileSpace (phones, tablets, reduced motion) the
// phone hero itself is in the server HTML too (<HeroShell/>, over the boot
// frame), so the portrait and the name are the first paint and the LCP; the
// live hero takes over from it when MobileSpace mounts
// (components/mobile/hero).

'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { preload } from 'react-dom'
import dynamic from 'next/dynamic'

import { JsonLd } from '@/components/seo/JsonLd'
import { profilePageSchema, projectsItemListSchema, faqSchema } from '@/lib/seo/jsonld'
import { SeoContent } from '@/components/seo/SeoContent'
import { BootFrame, LoadingScreen, warmAppChunks } from '@/components/ui/LoadingScreen'
import { HERO_STICKER, HeroShell } from '@/components/mobile/hero/Hero'
import { registerHeroShell } from '@/components/mobile/hero/handoff'
import { MOBILE_EXPERIENCE_MEDIA } from '@/components/mobile/hero/media'

const AppShell = dynamic(() => import('@/components/AppShell'), {
  ssr: false,
  loading: () => <BootFrame />,
})

// Without this the experience's chunk waits for a 3-hop chain: this page,
// then AppShell's chunk (requested only when hydration reaches <AppShell>),
// then AppShell's eligibility effect. Start both while the page hydrates
// instead, the experience with the same rule AppShell uses to pick it (keep
// the two in sync). AppShell and the loader still warm it too; a repeated
// import() of a loaded or loading chunk is a no-op.
// Only when the home page is the document being loaded: other pages prefetch
// '/', which evaluates this module too, and must not pull the home experience
// (three.js on desktop) into a page with no canvas.
if (typeof window !== 'undefined' && window.location.pathname === '/') {
  import('@/components/AppShell').catch(() => {})
  try {
    const forced  = new URLSearchParams(window.location.search).get('view')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const desktop = window.matchMedia('(min-width: 1024px) and (hover: hover)').matches && !reduced
    warmAppChunks(
      forced === 'tunnel' ? 'tunnel' : forced === 'mobile' ? 'mobile' : desktop ? 'tunnel' : 'mobile',
    )
  } catch {
    /* AppShell warms the chunk itself once it knows the path */
  }
}

export default function Page() {
  const [booting, setBooting] = useState(true)
  // The server-rendered hero, until MobileSpace's own hero takes over (or the
  // tunnel mounts). Desktop never shows it (CSS): drop it once hydrated there.
  const [heroShell, setHeroShell] = useState(true)
  useLayoutEffect(() => {
    if (!window.matchMedia(MOBILE_EXPERIENCE_MEDIA).matches) { setHeroShell(false); return }
    return registerHeroShell(() => setHeroShell(false))
  }, [])

  // The hero's portrait, hoisted into <head> by React during the server
  // render: fetched before the parser reaches the stand-in's <img>, with the
  // same srcset and sizes (so the same candidate), and only on the screens
  // AppShell sends to MobileSpace (not min-width 1024 + hover, or reduced
  // motion).
  preload(HERO_STICKER.src, {
    as: 'image',
    imageSrcSet: HERO_STICKER.srcSet,
    imageSizes: HERO_STICKER.sizes,
    fetchPriority: 'high',
    media: MOBILE_EXPERIENCE_MEDIA,
  })

  useEffect(() => {
    // The inline script in app/layout.tsx marks <html data-booted> before
    // first paint when this session has already seen the card.
    if (document.documentElement.hasAttribute('data-booted')) { setBooting(false); return }
    try {
      if (sessionStorage.getItem('sf-booted') === '1') setBooting(false)
    } catch {
      /* storage blocked: show the intro */
    }
  }, [])

  const onBootComplete = useCallback(() => {
    try { sessionStorage.setItem('sf-booted', '1') } catch { /* storage blocked */ }
    setBooting(false)
  }, [])

  return (
    <>
      <JsonLd data={profilePageSchema()} />
      <JsonLd data={projectsItemListSchema()} />
      <JsonLd data={faqSchema()} />

      {/* Always server-rendered, crawlable text version of the portfolio —
          indexable + accessible alternative to the WebGL canvas. Its links
          are out of the Tab order (tabIndex -1), so keyboard focus starts on
          the visible UI. */}
      <SeoContent />

      <AppShell />
      {/* After AppShell: it paints over the boot frame, and MobileSpace's
          SVG gradient ids come first in the document. */}
      {heroShell && <HeroShell />}
      {booting && <LoadingScreen onComplete={onBootComplete} />}
    </>
  )
}
