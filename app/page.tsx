// app/page.tsx — slim boot shell.
//
// During the 3 s intro, ONLY <LoadingScreen> and a tiny <JsonLd> render. The
// entire app (sections, R3F, detect-gpu, etc.) lives behind a next/dynamic
// boundary in <AppShell>, so its bundle does not download or hydrate while
// the loader is visible. That gives the intro a clean main thread and kills
// the perceived "jerks" caused by hydration / detect-gpu blocking.

'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

import { JsonLd } from '@/components/seo/JsonLd'
import { profilePageSchema, projectsItemListSchema } from '@/lib/seo/jsonld'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

const AppShell = dynamic(() => import('@/components/AppShell'), { ssr: false })

export default function Page() {
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('sf-booted') === '1') {
      setBooting(false)
    }
  }, [])

  const onBootComplete = useCallback(() => {
    if (typeof window !== 'undefined') sessionStorage.setItem('sf-booted', '1')
    setBooting(false)
  }, [])

  return (
    <>
      <JsonLd data={profilePageSchema()} />
      <JsonLd data={projectsItemListSchema()} />

      {booting
        ? <LoadingScreen onComplete={onBootComplete} />
        : <AppShell />
      }
    </>
  )
}
