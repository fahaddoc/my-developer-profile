// components/layout/Footer.tsx

import { navLinks } from '@/data/nav-links'
import { SOCIALS, AUTHOR } from '@/lib/seo/site'

const socialLinks = [
  { url: SOCIALS.github, label: 'GitHub', rel: 'me' },
  { url: SOCIALS.linkedin, label: 'LinkedIn', rel: 'me' },
  { url: SOCIALS.twitter, label: 'X / Twitter', rel: 'me' },
].filter((s) => Boolean(s.url))

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-accent-violet/10 mt-24">
      <div className="max-w-content mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Brand */}
          <div>
            <span className="font-display font-bold text-lg text-accent-violet">SF</span>
            <p className="text-text-muted text-sm mt-1">
              {AUTHOR.name} — {AUTHOR.jobTitle}, {AUTHOR.city}, {AUTHOR.countryName}.
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-text-muted hover:text-text-primary transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {socialLinks.length > 0 && (
            <nav aria-label="Social profiles" className="flex flex-wrap gap-4">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel={`${s.rel} noopener noreferrer`}
                  className="text-sm text-text-muted hover:text-accent-violet transition-colors duration-200"
                >
                  {s.label}
                </a>
              ))}
            </nav>
          )}

          {/* Copyright */}
          <p className="text-sm text-text-muted">
            © {year} {AUTHOR.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
