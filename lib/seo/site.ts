export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://shahfahad.dev').replace(/\/$/, '')

export const SITE_NAME = 'Shah Fahad'

export const AUTHOR = {
  name: 'Shah Fahad',
  jobTitle: 'Senior Software Engineer',
  email: 'hello@shahfahad.dev',
  phone: '+92 304 2186009',
  city: 'Karachi',
  country: 'PK',
  countryName: 'Pakistan',
  image: '/images/shah-fahad.jpeg',
} as const

export const SOCIALS = {
  github: process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/fahaddoc',
  linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL || 'https://www.linkedin.com/in/fahaddoc600',
  twitter: process.env.NEXT_PUBLIC_TWITTER_URL || '',
  twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE || '',
} as const

export const sameAsLinks = (): string[] =>
  [SOCIALS.github, SOCIALS.linkedin, SOCIALS.twitter].filter((u): u is string => Boolean(u))

export const KEYWORDS = [
  'Shah Fahad',
  'Shah Fahad developer',
  'Shah Fahad software engineer',
  'Shah Fahad Karachi',
  'Shah Fahad portfolio',
  'React developer Karachi',
  'React.js developer Pakistan',
  'Next.js developer Karachi',
  'Next.js developer Pakistan',
  'Flutter developer Karachi',
  'Flutter developer Pakistan',
  'mobile app developer Karachi',
  'mobile app developer Pakistan',
  'web developer Karachi',
  'web developer Pakistan',
  'frontend engineer Karachi',
  'frontend developer Pakistan',
  'TypeScript engineer',
  'WebRTC developer',
  'WebRTC engineer',
  'SignalR developer',
  'real-time video developer',
  'video conferencing developer',
  'real-time application developer',
  'software engineer Karachi',
  'senior software engineer Pakistan',
  'Konnect.im',
  'DigitalHire engineer',
] as const
