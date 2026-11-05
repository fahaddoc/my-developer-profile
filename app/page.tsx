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
import dynamic from 'next/dynamic'

import { JsonLd } from '@/components/seo/JsonLd'
import { profilePageSchema, projectsItemListSchema, faqSchema } from '@/lib/seo/jsonld'
import { SeoContent } from '@/components/seo/SeoContent'
import { BootFrame, LoadingScreen } from '@/components/ui/LoadingScreen'

const AppShell = dynamic(() => import('@/components/AppShell'), {
  ssr: false,
  loading: () => <BootFrame />,
})

export default function Page() {
  const [booting, setBooting] = useState(true)

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
