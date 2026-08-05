// components/featured/FeaturedAchievement.tsx
// The visible "Featured Achievement" block on the home surface (mobile / classic
// space experience). Self-contained and token-styled so it drops into a
// MobileSpace <Station> without coupling to that file's internals. Reads the
// featured contribution from the single source of truth in data/open-source.ts.

import Link from 'next/link'
import { contributions } from '@/data/open-source'
import { FlutterLogo, GitHubLogo, MergedGlyph } from '@/components/featured/BrandLogos'

const A = 'rgb(var(--os-accent))'
const Aa = (a: number) => `rgb(var(--os-accent) / ${a})`
const TXT = 'rgb(var(--text-primary))'
const SUB = 'rgb(var(--text-secondary))'
const FLUTTER = '#54C5F8'                       // decorative orb only
const FLUTTER_T = 'rgb(var(--flutter-accent))'  // logo tint — AA in light
const MERGED = 'rgb(var(--status-merged))'
const REMOVED = 'rgb(var(--status-removed))'

/**
 * @param active  drives the one-shot entrance animation (matches sibling stations)
 * @param n       display number in the station sequence (e.g. 5 → "05 · OPEN SOURCE")
 */
export function FeaturedAchievement({ active = true, n = 5 }: { active?: boolean; n?: number }) {
  const c = contributions[0]

  return (
    <div>
      {/* orb + eyebrow + heading — mirrors the mobile StationHead pattern */}
      <div
        aria-hidden
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          marginBottom: 14,
          background: `radial-gradient(circle at 34% 30%, ${FLUTTER}, ${Aa(0.15)} 68%, transparent)`,
          boxShadow: `0 0 30px ${Aa(0.45)}`,
          border: `1px solid ${Aa(0.4)}`,
          animation: active ? 'mob-planet-in 0.7s cubic-bezier(0.22,1,0.36,1) both' : 'none',
        }}
      />
      <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '0.22em', color: A, textTransform: 'uppercase' }}>
        {String(n).padStart(2, '0')} · Open Source
      </div>
      <h2 style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 800, fontSize: 'clamp(30px, 9vw, 44px)', lineHeight: 1, margin: '8px 0 0', color: TXT }}>
        Merged into <span style={{ color: A }}>{c.org}</span>
      </h2>

      {/* the achievement card */}
      <article
        style={{
          marginTop: 18,
          borderRadius: 16,
          padding: 16,
          background: 'rgb(var(--bg-surface) / 0.5)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${Aa(0.18)}`,
          boxShadow: `0 18px 50px rgb(0 0 0 / 0.28)`,
        }}
      >
        {/* logos + merged badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {c.org === 'Flutter' ? (
            <FlutterLogo size={26} title="Flutter" style={{ color: FLUTTER_T }} />
          ) : (
            <span aria-hidden style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, color: A }}>{c.org}</span>
          )}
          <GitHubLogo size={22} title="GitHub" style={{ color: TXT }} />
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginLeft: 'auto',
              padding: '4px 10px',
              borderRadius: 999,
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: MERGED,
              background: 'rgb(var(--status-merged) / 0.12)',
              border: '1px solid rgb(var(--status-merged) / 0.4)',
            }}
          >
            <MergedGlyph size={13} /> Merged
          </span>
        </div>

        {/* PR title + explanation */}
        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10.5, color: A, letterSpacing: '0.02em', marginTop: 14 }}>
          {c.repo} · #{c.prNumber} · {c.displayDate}
        </div>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: TXT, lineHeight: 1.4, margin: '6px 0 0' }}>
          {c.prTitle}
        </p>
        <p style={{ fontSize: 12.5, color: SUB, lineHeight: 1.55, marginTop: 8 }}>
          {c.summary}
        </p>

        {/* diff stat */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, fontFamily: 'var(--font-mono), monospace', fontSize: 11 }}>
          <span style={{ color: SUB }}>{c.filesChanged} files</span>
          <span style={{ color: MERGED }}>+{c.additions}</span>
          <span style={{ color: REMOVED }}>&minus;{c.deletions}</span>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <a
            href={c.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '10px 16px',
              borderRadius: 12,
              background: A,
              color: '#05070d',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textDecoration: 'none',
            }}
          >
            <GitHubLogo size={14} /> View Pull Request ↗
          </a>
          <Link
            href={`/achievements/${c.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '10px 16px',
              borderRadius: 12,
              background: 'transparent',
              color: A,
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textDecoration: 'none',
              border: `1px solid ${Aa(0.4)}`,
            }}
          >
            Read the case study →
          </Link>
        </div>
      </article>

      <div style={{ marginTop: 12 }}>
        <Link href="/open-source" style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, color: SUB, letterSpacing: '0.06em', textDecoration: 'none' }}>
          ✦ all open-source work →
        </Link>
      </div>
    </div>
  )
}
