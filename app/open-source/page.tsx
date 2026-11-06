import type { Metadata } from 'next'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, openSourceCollectionSchema } from '@/lib/seo/jsonld'
import { SITE_URL, AUTHOR } from '@/lib/seo/site'
import { PageShell } from '@/components/site/PageShell'
import { OpenSource } from '@/components/site/pages/OpenSource'

export const metadata: Metadata = {
  title: 'Open Source Contributions',
  description:
    'Open-source contributions by Shah Fahad, a React and Flutter developer from Pakistan — five merged pull requests across the official Flutter repository (flutter/flutter) and the Supabase Flutter SDK.',
  alternates: { canonical: '/open-source' },
  keywords: [
    'Flutter open source contributor',
    'Flutter framework contribution',
    'Flutter open source',
    'Flutter GitHub PR',
    'open source contributor Pakistan',
    'Software Engineer Pakistan',
    'React and Flutter developer',
    `${AUTHOR.name} open source`,
  ],
  openGraph: {
    type: 'website',
    title: 'Open Source Contributions — Shah Fahad',
    description:
      'Contributing to the tools I build with — merged pull requests in flutter/flutter and supabase/supabase-flutter.',
    url: `${SITE_URL}/open-source`,
    siteName: 'Shah Fahad',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Source Contributions — Shah Fahad',
    description:
      'Five merged pull requests across Flutter and Supabase: clearer setState() and initState() diagnostics, lifecycle and Positioned/Overlay documentation, and a Postgres array parser.',
  },
}

export default function OpenSourcePage() {
  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Open Source', url: `${SITE_URL}/open-source` },
  ])

  return (
    <>
      <JsonLd data={openSourceCollectionSchema()} />
      <JsonLd data={breadcrumbs} />

      <PageShell back={{ href: '/#opensource', label: 'Journey' }} where="Open source">
        <OpenSource />
      </PageShell>
    </>
  )
}
