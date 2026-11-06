// app/tunnel/layout.tsx — /tunnel is a standalone dev preview of the tunnel
// scene, not a page for search. The page itself is 'use client' and cannot
// export metadata, so the noindex lives here.

import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function TunnelLayout({ children }: { children: React.ReactNode }) {
  return children
}
