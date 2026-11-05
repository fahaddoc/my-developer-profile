// app/layout.tsx

import type { Metadata, Viewport } from 'next'
import { Archivo, JetBrains_Mono } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { SmoothScroll } from '@/components/providers/SmoothScroll'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ProjectDrawerProvider } from '@/components/providers/ProjectDrawerProvider'
import { ContactDrawerProvider } from '@/components/providers/ContactDrawerProvider'
import { LeFluxEmbed } from '@/components/ui/LeFluxEmbed'
import { JsonLd } from '@/components/seo/JsonLd'
import { personSchema, websiteSchema } from '@/lib/seo/jsonld'
import { SITE_URL, SITE_NAME, AUTHOR, KEYWORDS, SOCIALS } from '@/lib/seo/site'
import './globals.css'

// Archivo — one variable family (wdth 62–125, wght 100–900) carries the whole
// voice: expanded + heavy for film-title display type, normal width for
// reading. --font-body aliases it in globals.css, so it downloads once.
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-display',
  display: 'swap',
})

// JetBrains Mono — real data only (PR numbers, dates, diffs). 700 is loaded so
// bold mono is never synthesised.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
})

const TITLE_DEFAULT = `${AUTHOR.name} — ${AUTHOR.jobTitle} | React, Next.js, Flutter, WebRTC`
const DESCRIPTION = `${AUTHOR.name} — ${AUTHOR.jobTitle} in ${AUTHOR.city}, ${AUTHOR.countryName} with 8+ years building real-time web and mobile applications. Expert in React, Next.js, TypeScript, Flutter, WebRTC, and SignalR. Available for opportunities.`

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
    { media: '(prefers-color-scheme: dark)',  color: '#05080f' },
    { media: '(prefers-color-scheme: light)', color: '#f4f7fb' },
  ],
}

// Inline script that runs BEFORE React hydrates.
//  - Reads localStorage (or prefers-color-scheme) and sets data-theme on
//    <html> so the CSS variables apply on the very first paint — no flash of
//    dark theme when the user has selected light, or vice versa.
//  - Marks the loader state for the first paint: data-booted when this
//    session has already seen the title card (the server-rendered card is
//    hidden at once instead of flashing until hydration), else data-booting
//    on the home route while the card plays (see components/ui/LoadingScreen).
const NO_FLASH_SCRIPT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}d.setAttribute('data-theme',t);}catch(e){d.setAttribute('data-theme','dark');}try{if(sessionStorage.getItem('sf-booted')==='1'){d.setAttribute('data-booted','');}else if(location.pathname==='/'){d.setAttribute('data-booting','');}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  return (
    <html lang="en" suppressHydrationWarning className={`${archivo.variable} ${jetbrainsMono.variable}`}>
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
        {/* Film grain over every route (see .grain in globals.css). */}
        <div className="grain" aria-hidden />
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
        {/* Vercel Web Analytics + Speed Insights — visitor counts & vitals
            show up in the Vercel dashboard (Analytics tab) once enabled. */}
        <Analytics />
        <SpeedInsights />
        {/* Chat widget: injected after the first interaction or ≥5s idle,
            never during the loader or hydration (lazyOnload). */}
        <LeFluxEmbed />
      </body>
    </html>
  )
}
