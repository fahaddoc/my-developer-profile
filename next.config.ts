import type { NextConfig } from 'next'

const config: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
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
