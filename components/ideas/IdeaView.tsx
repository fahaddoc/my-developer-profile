'use client'

import dynamic from 'next/dynamic'
import { IdeasShell } from './IdeasShell'
import { CONCEPTS } from './concepts'

const VIEWS: Record<string, React.ComponentType> = {
  current:   dynamic(() => import('@/components/projects/ProjectShowcase').then((m) => m.ProjectShowcase), { ssr: false }),
  stars:     dynamic(() => import('./StarMap').then((m) => m.StarMap), { ssr: false }),
  orbit:     dynamic(() => import('./Orbit').then((m) => m.Orbit), { ssr: false }),
  deck:      dynamic(() => import('./Deck').then((m) => m.Deck), { ssr: false }),
  postcards: dynamic(() => import('./Postcards').then((m) => m.Postcards), { ssr: false }),
  reel:      dynamic(() => import('./Reel').then((m) => m.Reel), { ssr: false }),
}

export function IdeaView({ slug }: { slug: string }) {
  const concept = CONCEPTS.find((c) => c.slug === slug)!
  const View = VIEWS[slug]
  return (
    <IdeasShell title={`${concept.title} · concept ${CONCEPTS.indexOf(concept) + 1} of ${CONCEPTS.length}`}>
      <p className="t-lead" style={{ maxWidth: '62ch', margin: '0 auto 24px', textAlign: 'center', fontSize: 15 }}>{concept.blurb}</p>
      <div style={{ minHeight: '72dvh', display: 'grid', alignItems: 'center' }}>
        <View />
      </div>
    </IdeasShell>
  )
}
