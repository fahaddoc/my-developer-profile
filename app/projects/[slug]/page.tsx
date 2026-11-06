import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projects } from '@/data/projects'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, projectSchema } from '@/lib/seo/jsonld'
import { SITE_URL, AUTHOR } from '@/lib/seo/site'
import { ProjectCase } from '@/components/site/pages/ProjectCase'

export const dynamicParams = false

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.id }))
}

type Params = { slug: string }

async function findProject(slug: string) {
  return projects.find((p) => p.id === slug)
}

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { slug } = await params
  const project = await findProject(slug)
  if (!project) return {}

  const title = `${project.title} — ${project.tech.join(', ')}`
  const description = `${project.tagline}. ${project.description.slice(0, 160)}`
  const url = `${SITE_URL}/projects/${project.id}`

  return {
    title,
    description,
    alternates: { canonical: `/projects/${project.id}` },
    keywords: [
      project.title,
      ...project.tech,
      `${project.category} development`,
      `${AUTHOR.name} ${project.title}`,
      `${AUTHOR.name} project`,
      project.company,
    ],
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: 'Shah Fahad',
      images: [{ url: project.image, width: 1200, height: 630, alt: project.title }],
      authors: [`${SITE_URL}`],
    },
    twitter: { card: 'summary_large_image', title, description, images: [project.image] },
  }
}

/** Intrinsic size of a /public image (jpg, png or svg), read once at build so
 *  the viewport takes the screenshot's real shape: wide shots are never
 *  cropped and phone screens sit upright instead of being cut to a strip. */
function imageSize(src: string): { w: number; h: number } {
  const fallback = { w: 1600, h: 1000 }
  try {
    const b = readFileSync(join(process.cwd(), 'public', src))
    if (src.endsWith('.svg')) {
      const t = b.toString('utf8', 0, 600)
      const vb = t.match(/viewBox="[\d.\s-]*?\s([\d.]+)\s+([\d.]+)"/)
      const w = t.match(/\swidth="([\d.]+)"/)
      const h = t.match(/\sheight="([\d.]+)"/)
      if (w && h) return { w: Number(w[1]), h: Number(h[1]) }
      if (vb) return { w: Number(vb[1]), h: Number(vb[2]) }
      return fallback
    }
    if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i++; continue }
        const m = b[i + 1]
        // start-of-frame markers carry the size (C4, C8, CC are not frames)
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }
        }
        i += 2 + b.readUInt16BE(i + 2)
      }
    }
  } catch {
    // a missing file falls back to a 16:10 frame
  }
  return fallback
}

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const project = await findProject(slug)
  if (!project) notFound()

  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Projects', url: `${SITE_URL}/#projects` },
    { name: project.title, url: `${SITE_URL}/projects/${project.id}` },
  ])

  return (
    <>
      <JsonLd data={projectSchema(project)} />
      <JsonLd data={breadcrumbs} />
      <ProjectCase project={project} size={imageSize(project.image)} />
    </>
  )
}
