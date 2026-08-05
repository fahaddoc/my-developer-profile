// components/seo/SeoContent.tsx
//
// Crawlable, server-rendered text representation of the portfolio. The visible
// experience is a WebGL canvas (mounted client-side via a ssr:false AppShell),
// so search engines and screen readers would otherwise see almost no readable
// content. This component renders the same information as genuine semantic HTML
// — one H1, real prose, skills, experience, and internally-linked projects — so
// the page is fully indexable and accessible. It is visually hidden (sr-only),
// not display:none, so it stays in the accessibility tree and the crawled DOM.
//
// This is the accessible/SEO text alternative to the canvas — real page content,
// not hidden keyword stuffing.

import { projects, experience, skills } from '@/data/projects'
import { contributions } from '@/data/open-source'
import { AUTHOR } from '@/lib/seo/site'

export function SeoContent() {
  return (
    <div className="sr-only">
      <article>
        <h1>Shah Fahad — Senior Software Engineer (React, Next.js, Flutter, WebRTC)</h1>
        <p>
          Shah Fahad is a Senior Software Engineer based in {AUTHOR.city}, {AUTHOR.countryName}, with
          6+ years of experience building real-time, high-performance web and mobile applications. He
          specializes in React, Next.js, TypeScript, Flutter, WebRTC, and SignalR — from
          enterprise video-conferencing platforms to modern hiring systems and cross-platform mobile
          apps. He is currently a Software Engineer at DigitalHire and is available for new
          opportunities, including remote roles.
        </p>

        <section>
          <h2>Skills &amp; Technologies</h2>
          <ul>
            {skills.map((cat) => (
              <li key={cat.label}>
                <strong>{cat.label}:</strong> {cat.skills.join(', ')}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Professional Experience</h2>
          {experience.map((e) => (
            <div key={e.id}>
              <h3>
                {e.role} — {e.company} ({e.period})
              </h3>
              <ul>
                {e.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              <p>Technologies: {e.tech.join(', ')}.</p>
            </div>
          ))}
        </section>

        <section>
          <h2>Projects</h2>
          <ul>
            {projects.map((p) => (
              <li key={p.id}>
                <h3>
                  <a href={`/projects/${p.id}`}>{p.title}</a>
                  {p.company ? ` — ${p.company}` : ''} ({p.year})
                </h3>
                <p>{p.tagline}</p>
                <p>{p.description}</p>
                <p>Built with: {p.tech.join(', ')}.</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Open Source Contributions</h2>
          <p>
            Shah Fahad contributes to open source as a React and Flutter developer, with two pull
            requests merged into the{' '}
            <a href="https://github.com/flutter/flutter">official Flutter repository</a>{' '}
            (<code>flutter/flutter</code>): one that improved the &ldquo;setState() called after
            dispose()&rdquo; diagnostic message, and one that documented the super call order for{' '}
            <code>State.didChangeDependencies</code>. See all{' '}
            <a href="/open-source">open-source contributions</a>.
          </p>
          <ul>
            {contributions.map((c) => (
              <li key={c.id}>
                <h3>
                  <a href={`/achievements/${c.id}`}>{c.title}</a> — {c.prTitle} ({c.displayDate})
                </h3>
                <p>{c.summary}</p>
                <p>
                  Merged pull request:{' '}
                  <a href={c.prUrl}>
                    {c.repo} #{c.prNumber}
                  </a>
                  . Built with: {c.tech.join(', ')}.
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Email: <a href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</a>. Based in {AUTHOR.city},{' '}
            {AUTHOR.countryName}. Connect on{' '}
            <a href="https://github.com/fahaddoc">GitHub</a> and{' '}
            <a href="https://www.linkedin.com/in/fahaddoc600">LinkedIn</a>.
          </p>
        </section>
      </article>
    </div>
  )
}
