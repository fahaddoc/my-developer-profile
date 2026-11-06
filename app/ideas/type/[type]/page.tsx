// app/ideas/type/[type]/page.tsx — one type direction applied to real pieces
// of the home page (not indexed by search).

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TYPES } from '@/components/ideas/type/fonts'
import { TypeView } from '@/components/ideas/type/TypeView'

export const metadata: Metadata = { title: 'Type styles', robots: { index: false, follow: false } }

export function generateStaticParams() {
  return TYPES.map((t) => ({ type: t.slug }))
}

export default async function TypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  if (!TYPES.some((t) => t.slug === type)) notFound()
  return <TypeView slug={type} />
}
