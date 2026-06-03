// app/layout.tsx

import type { Metadata, Viewport } from 'next'
import { Sora, Inter, JetBrains_Mono } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'
import { SmoothScroll } from '@/components/providers/SmoothScroll'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ProjectDrawerProvider } from '@/components/providers/ProjectDrawerProvider'
import { ContactDrawerProvider } from '@/components/providers/ContactDrawerProvider'
import { JsonLd } from '@/components/seo/JsonLd'
import { personSchema, websiteSchema } from '@/lib/seo/jsonld'
import { SITE_URL, SITE_NAME, AUTHOR, KEYWORDS, SOCIALS } from '@/lib/seo/site'
import './globals.css'

// Sora — geometric grotesque (same family as the .monks display type the
// user wanted to match). Loaded across the weight range we use in headings.
const sora = Sora({
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
    // og:image is provided by the dynamic app/opengraph-image.tsx route.
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
    creator: SOCIALS.twitterHandle || undefined,
    // twitter:image is provided by the dynamic app/twitter-image.tsx route.
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
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
}

// Inline script that runs BEFORE React hydrates. Reads localStorage (or
// prefers-color-scheme) and sets data-theme on <html> so the CSS variables
// apply on the very first paint — no flash of dark theme when the user has
// selected light, or vice versa.
const NO_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  return (
    <html lang="en" suppressHydrationWarning className={`${sora.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="bg-bg-base text-text-primary font-body antialiased">
        <JsonLd data={personSchema()} />
        <JsonLd data={websiteSchema()} />
        <ThemeProvider>
          <ProjectDrawerProvider>
            <ContactDrawerProvider>
              <SmoothScroll>{children}</SmoothScroll>
            </ContactDrawerProvider>
          </ProjectDrawerProvider>
        </ThemeProvider>
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
        {/* Vercel Web Analytics + Speed Insights — visitor counts & vitals
            show up in the Vercel dashboard (Analytics tab) once enabled. */}
        <Analytics />
        <SpeedInsights />
        <Script src="https://leflux.xrlabs.app/embed.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
