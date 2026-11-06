// app/ideas/[idea]/page.tsx — one Work-section concept on its own page.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CONCEPTS } from '@/components/ideas/concepts'
import { IdeaView } from '@/components/ideas/IdeaView'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export function generateStaticParams() {
  return CONCEPTS.map((c) => ({ idea: c.slug }))
}

export default async function IdeaPage({ params }: { params: Promise<{ idea: string }> }) {
  const { idea } = await params
  const concept = CONCEPTS.find((c) => c.slug === idea)
  if (!concept) notFound()
  return <IdeaView slug={concept.slug} />
}
