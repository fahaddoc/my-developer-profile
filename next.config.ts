import type { NextConfig } from 'next'

// Public assets keep their filenames across deploys (no content hash), so a
// week of fresh cache plus a month of stale-while-revalidate: repeat visits
// skip the network, and a replaced file still reaches everyone within a week.
// Give a changed asset a new filename when it must show up at once.
const PUBLIC_ASSET_CACHE = 'public, max-age=604800, stale-while-revalidate=2592000'

const config: NextConfig = {
  // A dev server can build into its own folder (NEXT_DIST_DIR=.next-dev) so it
  // never clobbers a production build being served from .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    // Inline the route's CSS as <style> in the HTML instead of render-blocking
    // <link> requests (production builds only).
    inlineCss: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Optimised /_next/image variants: 31 days instead of the 60 s default.
    minimumCacheTTL: 2678400,
  },
  async headers() {
    return ['/images/:path*', '/textures/:path*', '/videos/:path*'].map((source) => ({
      source,
      headers: [{ key: 'Cache-Control', value: PUBLIC_ASSET_CACHE }],
    }))
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.shahfahad.dev' }],
        destination: 'https://shahfahad.dev/:path*',
        permanent: true,
      },
    ]
  },
}

export default config
