import type { MetadataRoute } from 'next'
import { projects } from '@/data/projects'
import { contributions } from '@/data/open-source'
import { SITE_URL } from '@/lib/seo/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/open-source`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    ...contributions.map((c) => ({
      url: `${SITE_URL}/achievements/${c.id}`,
      lastModified: c.mergedOn ? new Date(c.mergedOn) : lastModified,
      changeFrequency: 'yearly' as const,
      priority: 0.8,
    })),
    ...projects.map((p) => ({
      url: `${SITE_URL}/projects/${p.id}`,
      lastModified,
      changeFrequency: 'yearly' as const,
      priority: 0.8,
    })),
  ]
}
