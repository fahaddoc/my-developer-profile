// app/page.tsx — slim boot shell.
//
// During the 3 s intro, ONLY <LoadingScreen> and a tiny <JsonLd> render. The
// entire app (sections, R3F, detect-gpu, etc.) lives behind a next/dynamic
// boundary in <AppShell>. The loader warms that chunk on idle at ~1.5 s so the
// handoff has no blank gap; every loader animation is compositor-only, so the
// download/parse cannot make the intro stutter.

'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

import { JsonLd } from '@/components/seo/JsonLd'
import { profilePageSchema, projectsItemListSchema, faqSchema } from '@/lib/seo/jsonld'
import { SeoContent } from '@/components/seo/SeoContent'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

const AppShell = dynamic(() => import('@/components/AppShell'), { ssr: false })

export default function Page() {
  const [booting, setBooting] = useState(true)

  useEffect(() => {
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
          indexable + accessible alternative to the WebGL canvas. */}
      <SeoContent />

      {booting
        ? <LoadingScreen onComplete={onBootComplete} />
        : <AppShell />
      }
    </>
  )
}
