import { projects, experience, skills, type Project } from '@/data/projects'
import { SITE_URL, SITE_NAME, AUTHOR, sameAsLinks } from './site'

const abs = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`)

const allSkills = (): string[] => {
  const flat = skills.flatMap((c) => c.skills)
  return Array.from(new Set(flat))
}

export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/#person`,
    name: AUTHOR.name,
    givenName: 'Shah',
    familyName: 'Fahad',
    jobTitle: AUTHOR.jobTitle,
    description: `${AUTHOR.jobTitle} with 6+ years of experience building real-time web and mobile applications. Specializing in React, Next.js, TypeScript, Flutter, WebRTC, and SignalR.`,
    url: SITE_URL,
    image: abs(AUTHOR.image),
    email: `mailto:${AUTHOR.email}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: AUTHOR.city,
      addressCountry: AUTHOR.country,
    },
    knowsAbout: allSkills(),
    knowsLanguage: ['English', 'Urdu'],
    worksFor: {
      '@type': 'Organization',
      name: 'DigitalHire',
    },
    hasOccupation: {
      '@type': 'Occupation',
      name: AUTHOR.jobTitle,
      occupationLocation: {
        '@type': 'City',
        name: AUTHOR.city,
      },
      skills: allSkills().join(', '),
    },
    alumniOf: experience.slice(1).map((e) => ({
      '@type': 'Organization',
      name: e.company,
    })),
    sameAs: sameAsLinks(),
  }
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: `Portfolio of ${AUTHOR.name} — ${AUTHOR.jobTitle}`,
    inLanguage: 'en',
    publisher: { '@id': `${SITE_URL}/#person` },
  }
}

export function profilePageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${SITE_URL}/#profilepage`,
    url: SITE_URL,
    name: `${AUTHOR.name} — ${AUTHOR.jobTitle}`,
    description: `Portfolio of ${AUTHOR.name}, ${AUTHOR.jobTitle} based in ${AUTHOR.city}, ${AUTHOR.countryName}.`,
    mainEntity: { '@id': `${SITE_URL}/#person` },
    inLanguage: 'en',
  }
}

export function projectsItemListSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Featured Projects by Shah Fahad',
    numberOfItems: projects.length,
    itemListElement: projects.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/projects/${p.id}`,
      name: p.title,
    })),
  }
}

export function projectSchema(p: Project) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${SITE_URL}/projects/${p.id}#creativework`,
    name: p.title,
    headline: p.title,
    description: p.description,
    abstract: p.tagline,
    url: `${SITE_URL}/projects/${p.id}`,
    image: abs(p.image),
    dateCreated: p.year,
    keywords: p.tech.join(', '),
    inLanguage: 'en',
    creator: { '@id': `${SITE_URL}/#person` },
    author: { '@id': `${SITE_URL}/#person` },
    about: p.tech.map((t) => ({ '@type': 'Thing', name: t })),
    isPartOf: { '@id': `${SITE_URL}/#website` },
    sourceOrganization: p.company
      ? { '@type': 'Organization', name: p.company }
      : undefined,
  }
}

export function breadcrumbSchema(crumbs: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  }
}
