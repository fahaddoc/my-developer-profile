import { renderProjectOg, OG_SIZE, OG_PROJECT_ALT } from '@/lib/og'
import { projects } from '@/data/projects'

export const runtime = 'nodejs'
export const dynamicParams = false
export const alt = OG_PROJECT_ALT
export const size = OG_SIZE
export const contentType = 'image/png'

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.id }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return renderProjectOg(projects.find((p) => p.id === slug) ?? projects[0])
}
