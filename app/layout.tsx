// app/layout.tsx

import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from 'next/font/google'
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

export const metadata: Metadata = {
  title: 'Shah Fahad — Software Engineer',
  description:
    'Senior Software Engineer with 6+ years of experience building real-time web and mobile applications. Specializing in React, Next.js, Flutter, WebRTC and SignalR.',
  keywords: ['Software Engineer', 'React', 'Next.js', 'Flutter', 'WebRTC', 'Karachi', 'Pakistan'],
  authors: [{ name: 'Shah Fahad' }],
  openGraph: {
    title: 'Shah Fahad — Software Engineer',
    description: 'Senior Software Engineer specializing in React, Flutter, and real-time applications.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-bg-base text-text-primary font-body antialiased">
        {children}
      </body>
    </html>
  )
}
