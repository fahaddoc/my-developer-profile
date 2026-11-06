// app/ideas/page.tsx — index of the Work-section concepts (not indexed by search).

import type { Metadata } from 'next'
import { IdeasIndex } from '@/components/ideas/IdeasIndex'

export const metadata: Metadata = {
  title: 'Ideas',
  robots: { index: false, follow: false },
}

export default function IdeasPage() {
  return <IdeasIndex />
}
