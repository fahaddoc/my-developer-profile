import { renderAchievementOg, OG_SIZE, OG_ACHIEVEMENT_ALT } from '@/lib/seo/og'
import { contributions, getContribution } from '@/data/open-source'

export const runtime = 'nodejs'
export const alt = OG_ACHIEVEMENT_ALT
export const size = OG_SIZE
export const contentType = 'image/png'

export function generateStaticParams() {
  return contributions.map((c) => ({ slug: c.id }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return renderAchievementOg(getContribution(slug) ?? contributions[0])
}
