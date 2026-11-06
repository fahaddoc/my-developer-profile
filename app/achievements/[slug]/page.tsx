import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { contributions, getContribution } from '@/data/open-source'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, techArticleSchema } from '@/lib/seo/jsonld'
import { SITE_URL, AUTHOR } from '@/lib/seo/site'
import { Achievement } from '@/components/site/pages/Achievement'

export const dynamicParams = false

export function generateStaticParams() {
  return contributions.map((c) => ({ slug: c.id }))
}

type Params = { slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const c = getContribution(slug)
  if (!c) return {}

  const title = `${c.title} — ${c.org} Open Source`
  const description = c.summary
  const url = `${SITE_URL}/achievements/${c.id}`

  return {
    title,
    description,
    alternates: { canonical: `/achievements/${c.id}` },
    keywords: [
      ...c.keywords,
      `${AUTHOR.name} Flutter contributor`,
      'React and Flutter developer',
      'Software Engineer Pakistan',
      'Full Stack Engineer Pakistan',
    ],
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: 'Shah Fahad',
      publishedTime: c.mergedOn,
      modifiedTime: c.mergedOn,
      authors: [SITE_URL],
      tags: c.tech,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function AchievementPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const c = getContribution(slug)
  if (!c) notFound()

  const url = `${SITE_URL}/achievements/${c.id}`
  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Open Source', url: `${SITE_URL}/open-source` },
    { name: c.title, url },
  ])

  // contributions are newest merge first: the one before is newer, after is older
  const i = contributions.findIndex((x) => x.id === c.id)

  return (
    <>
      <JsonLd data={techArticleSchema(c)} />
      <JsonLd data={breadcrumbs} />
      <Achievement
        c={c}
        newer={contributions[i - 1]}
        older={contributions[i + 1]}
        total={contributions.length}
      />
    </>
  )
}
