// app/ideas/palette/[palette]/page.tsx — one colour + material direction on
// the cockpit HUD type (not indexed by search).

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PALETTES } from '@/components/ideas/palette/palettes'
import { PaletteView } from '@/components/ideas/palette/PaletteView'

export const metadata: Metadata = { title: 'Palettes', robots: { index: false, follow: false } }

export function generateStaticParams() {
  return PALETTES.map((p) => ({ palette: p.slug }))
}

export default async function PalettePage({ params }: { params: Promise<{ palette: string }> }) {
  const { palette } = await params
  if (!PALETTES.some((p) => p.slug === palette)) notFound()
  return <PaletteView slug={palette} />
}
