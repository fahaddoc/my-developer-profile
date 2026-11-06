// app/page.tsx — slim boot shell.
//
// <AppShell> (sections, R3F, detect-gpu, …) lives behind a next/dynamic
// boundary and mounts on the first frame. On the first visit of a session
// <LoadingScreen> plays ABOVE it as an overlay: the app downloads, hydrates
// and draws its first frame underneath, and the card crossfades out once
// AppShell reports ready (capped, see LoadingScreen). Until AppShell's chunk
// arrives its loading fallback is the loader's last frame (BootFrame), so
// there is never an empty frame, with or without the card.

'use client'

import { useCallback, useEffect, useState } from 'react'
import { preload } from 'react-dom'
import dynamic from 'next/dynamic'
import { getImageProps } from 'next/image'

import { JsonLd } from '@/components/seo/JsonLd'
import { profilePageSchema, projectsItemListSchema, faqSchema } from '@/lib/seo/jsonld'
import { SeoContent } from '@/components/seo/SeoContent'
import { BootFrame, LoadingScreen, warmAppChunks } from '@/components/ui/LoadingScreen'

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

// The phone hero is the sticker <Image priority> in MobileSpace's IntroCard.
// MobileSpace is client-only, so that image's own preload only reaches the
// page after two chunks. Emit the same preload (same src, sizes and so the
// same srcset) in the server HTML, limited to the screens AppShell sends to
// MobileSpace: not (min-width 1024 + hover), or reduced motion. Keep src and
// sizes in sync with IntroCard.
const HERO_STICKER = getImageProps({
  src: '/images/shah-fahad-sticker.png',
  alt: '',
  fill: true,
  sizes: '(min-width: 1024px) 540px, (min-width: 640px) 500px, 320px',
}).props
const MOBILE_EXPERIENCE_MEDIA =
  'not all and (min-width: 1024px) and (hover: hover), (prefers-reduced-motion: reduce)'

export default function Page() {
  const [booting, setBooting] = useState(true)

  // Hoisted into <head> by React during the server render.
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
      {booting && <LoadingScreen onComplete={onBootComplete} />}
    </>
  )
}
