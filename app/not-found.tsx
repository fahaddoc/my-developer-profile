import type { Metadata } from 'next'
import { NotFoundPage } from '@/components/site/pages/NotFound'

export const metadata: Metadata = {
  title: '404 — Lost in space',
  robots: { index: false, follow: false },
}

// Lightweight 404 (no WebGL): the shared PageShell backdrop + HUD, the way
// back into the journey and every station one jump away.
export default function NotFound() {
  return <NotFoundPage />
}
