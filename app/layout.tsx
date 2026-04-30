// app/layout.tsx

import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import { SmoothScroll } from '@/components/providers/SmoothScroll'
import { JsonLd } from '@/components/seo/JsonLd'
import { personSchema, websiteSchema } from '@/lib/seo/jsonld'
import { SITE_URL, SITE_NAME, AUTHOR, KEYWORDS, SOCIALS } from '@/lib/seo/site'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-body',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

const TITLE_DEFAULT = `${AUTHOR.name} — ${AUTHOR.jobTitle} | React, Next.js, Flutter, WebRTC`
const DESCRIPTION = `${AUTHOR.name} — ${AUTHOR.jobTitle} in ${AUTHOR.city}, ${AUTHOR.countryName} with 6+ years building real-time web and mobile applications. Expert in React, Next.js, TypeScript, Flutter, WebRTC, and SignalR. Available for opportunities.`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [...KEYWORDS],
  authors: [{ name: AUTHOR.name, url: SITE_URL }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  applicationName: SITE_NAME,
  category: 'technology',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'profile',
    siteName: SITE_NAME,
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
    firstName: 'Shah',
    lastName: 'Fahad',
    username: 'shahfahad',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${AUTHOR.name} — ${AUTHOR.jobTitle}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
    creator: SOCIALS.twitterHandle || undefined,
    images: ['/twitter-image'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GSC_VERIFICATION,
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-bg-base text-text-primary font-body antialiased">
        <JsonLd data={personSchema()} />
        <JsonLd data={websiteSchema()} />
        <SmoothScroll>{children}</SmoothScroll>
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  )
}
