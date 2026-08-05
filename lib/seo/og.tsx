// lib/seo/og.tsx
// Shared renderer for the dynamic OG / Twitter share image (1200×630),
// matching the "Split · photo right" concept: space backdrop + stars, name +
// role + skills + experience line on the left, sticker photo with a teal glow
// on the right. Used by app/opengraph-image.tsx and app/twitter-image.tsx.

import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { Contribution } from '@/data/open-source'

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_ALT = 'Shah Fahad — Senior Software Engineer · React, Next.js, Flutter, WebRTC'

const TEAL = '#5EEAD4'
const TXT = '#F1F5F9'
const SUB = '#9aa7bd'
const SKILLS = ['React', 'Next.js', 'TypeScript', 'Flutter']

// deterministic star field (no Math.random → stable output)
const STARS = Array.from({ length: 44 }, (_, i) => ({
  x: (i * 73) % 100,
  y: (i * 37 + 11) % 100,
  s: i % 5 === 0 ? 3 : 2,
  teal: i % 4 === 0,
}))

// Fetch a Google font in a format Satori can parse (ttf / otf / woff — NOT
// woff2). The old UA keeps Google off woff2; it now answers with woff for
// Inter, so the format list has to include woff or nothing ever matches and
// every share image silently falls back to Satori's default font (which is
// wider, and overflows these layouts). Returns null on any failure so the
// build never breaks on a network hiccup.
async function loadInter(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko' },
    }).then((r) => r.text())
    const url = css.match(/src:\s*url\((https:\/\/[^)]+)\)\s*format\('(?:truetype|opentype|woff)'\)/)?.[1]
    if (!url) return null
    return await fetch(url).then((r) => r.arrayBuffer())
  } catch {
    return null
  }
}

const chip = {
  display: 'flex',
  fontSize: 28,
  padding: '12px 24px',
  borderRadius: 999,
  background: 'rgba(94,234,212,0.08)',
  border: '2px solid rgba(94,234,212,0.32)',
  color: '#cdeee7',
} as const

export async function renderOgImage(): Promise<ImageResponse> {
  const photo = readFileSync(join(process.cwd(), 'public/images/shah-fahad-sticker.png'))
  const photoSrc = `data:image/png;base64,${photo.toString('base64')}`

  const [reg, bold] = await Promise.all([loadInter(400), loadInter(800)])
  const fonts = [
    reg && { name: 'Inter', data: reg, weight: 400 as const, style: 'normal' as const },
    bold && { name: 'Inter', data: bold, weight: 800 as const, style: 'normal' as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 400 | 800; style: 'normal' }[]

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          color: TXT,
          fontFamily: fonts.length ? 'Inter' : 'sans-serif',
          backgroundColor: '#07070B',
          backgroundImage:
            'radial-gradient(900px 600px at 18% -8%, rgba(94,234,212,0.18), transparent 55%),' +
            'radial-gradient(800px 600px at 102% 118%, rgba(180,165,200,0.16), transparent 60%)',
        }}
      >
        {STARS.map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.s,
              height: s.s,
              borderRadius: 999,
              background: s.teal ? TEAL : '#ffffff',
              opacity: 0.5,
            }}
          />
        ))}

        {/* top-right url */}
        <div style={{ position: 'absolute', top: 50, right: 64, display: 'flex', alignItems: 'center', fontSize: 26, color: TEAL, letterSpacing: 2 }}>
          <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 999, background: TEAL, marginRight: 14 }} />
          shahfahad.dev
        </div>

        {/* left — text */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 70px', flex: 1 }}>
          <div style={{ display: 'flex', fontSize: 25, letterSpacing: 8, color: TEAL, marginBottom: 10 }}>SENIOR SOFTWARE ENGINEER</div>
          <div style={{ display: 'flex', fontSize: 138, fontWeight: 800, lineHeight: 1 }}>SHAH</div>
          <div style={{ display: 'flex', fontSize: 138, fontWeight: 800, lineHeight: 1, color: TEAL, marginBottom: 30 }}>FAHAD</div>
          <div style={{ display: 'flex', gap: 14 }}>
            {SKILLS.map((s) => (
              <div key={s} style={chip}>{s}</div>
            ))}
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: SUB, marginTop: 34 }}>6+ years · DigitalHire · Karachi, PK</div>
        </div>

        {/* right — photo + glow */}
        <div style={{ display: 'flex', width: 470, position: 'relative', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ display: 'flex', position: 'absolute', bottom: 60, width: 400, height: 400, borderRadius: 999, background: 'radial-gradient(circle, rgba(94,234,212,0.34), transparent 70%)' }} />
          <img src={photoSrc} width={452} height={600} style={{ objectFit: 'contain' }} />
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  )
}

// ── Open-source share images ────────────────────────────────────────────────
// Logos are embedded as SVG data-URIs (Satori renders these reliably regardless
// of version) so no binary asset is needed.

const FLUTTER_BLUE = '#54C5F8'
const MERGED_GREEN = '#3fb950'

const svgUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

const FLUTTER_SVG = svgUri(
  `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 24 24' fill='${FLUTTER_BLUE}'><path d='M14.314 0 2.3 12l3.68 3.68L21.66 0ZM14.31 11.716l-6.024 6.024 3.69 3.69L15.66 17.7 21.66 11.716Z'/></svg>`,
)
const GITHUB_SVG = svgUri(
  `<svg xmlns='http://www.w3.org/2000/svg' width='110' height='110' viewBox='0 0 24 24' fill='#F1F5F9'><path d='M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'/></svg>`,
)

async function ogFonts() {
  const [reg, bold] = await Promise.all([loadInter(400), loadInter(800)])
  return [
    reg && { name: 'Inter', data: reg, weight: 400 as const, style: 'normal' as const },
    bold && { name: 'Inter', data: bold, weight: 800 as const, style: 'normal' as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 400 | 800; style: 'normal' }[]
}

/**
 * Space-backdrop shell for the open-source share images.
 *
 * Pass the rows as an ARRAY, never a Fragment. Satori collapses a Fragment into
 * a single flex item whose own direction defaults to `row`, so `<>row1 row2</>`
 * renders the rows side by side and overflowing instead of stacked — which is
 * exactly what broke these images. An array is flattened into real flex
 * children and lays out under this container's `flexDirection: column`.
 */
function ogShell(children: React.ReactElement[]) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        color: TXT,
        fontFamily: 'Inter, sans-serif',
        backgroundColor: '#07070B',
        backgroundImage:
          'radial-gradient(900px 600px at 18% -8%, rgba(84,197,248,0.20), transparent 55%),' +
          'radial-gradient(800px 600px at 102% 118%, rgba(180,165,200,0.16), transparent 60%)',
        padding: '64px 72px',
        justifyContent: 'space-between',
      }}
    >
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.s,
            height: s.s,
            borderRadius: 999,
            background: s.teal ? TEAL : '#ffffff',
            opacity: 0.5,
          }}
        />
      ))}
      {children}
    </div>
  )
}

const OG_MERGED_ALT = 'Merged into the official Flutter repository'

// Slug-agnostic so it stays accurate when more contributions are added (the
// image itself renders the specific repo / PR title / diff).
export const OG_ACHIEVEMENT_ALT =
  'A merged open-source pull request by Shah Fahad — details on the share image'

export async function renderAchievementOg(c: Contribution): Promise<ImageResponse> {
  const fonts = await ogFonts()
  return new ImageResponse(
    ogShell([
      /* header row — brand url */
      <div key="head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FLUTTER_SVG} width={92} height={92} alt="Flutter" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GITHUB_SVG} width={74} height={74} alt="GitHub" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 26, color: TEAL, letterSpacing: 2 }}>
          <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 999, background: TEAL, marginRight: 14 }} />
          shahfahad.dev
        </div>
      </div>,

      /* headline */
      <div key="headline" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 24, letterSpacing: 8, color: TEAL, marginBottom: 14 }}>{c.repo} · PR #{c.prNumber}</div>
        <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, lineHeight: 1, maxWidth: 1056 }}>MERGED INTO {c.org.toUpperCase()}</div>
        <div style={{ display: 'flex', fontSize: 29, color: SUB, marginTop: 26, maxWidth: 1040 }}>
          {c.prTitle}
        </div>
      </div>,

      /* footer row — merged pill + name + diff */
      <div key="foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            aria-label={OG_MERGED_ALT}
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 2,
              color: MERGED_GREEN,
              padding: '12px 26px',
              borderRadius: 999,
              background: 'rgba(63,185,80,0.12)',
              border: '2px solid rgba(63,185,80,0.5)',
            }}
          >
            {/* just "MERGED" — the repo is already in the eyebrow above, and
                repeating it here overflowed the footer row */}
            MERGED
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: SUB }}>
            #{c.prNumber} · +{c.additions} / -{c.deletions}
          </div>
        </div>
        {/* nowrap + no shrink: if the webfont fetch fails the fallback metrics are
            wider, and without these the name wraps onto the diff line */}
        <div style={{ display: 'flex', flexShrink: 0, whiteSpace: 'nowrap', fontSize: 30, fontWeight: 800, color: TXT }}>
          Shah Fahad<span style={{ display: 'flex', color: TEAL, marginLeft: 12 }}>·</span>
          <span style={{ display: 'flex', color: SUB, marginLeft: 12, fontWeight: 400 }}>Software Engineer</span>
        </div>
      </div>,
    ]),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  )
}

export const OG_OPENSOURCE_ALT = 'Open Source Contributions by Shah Fahad'

export async function renderOpenSourceOg(stats: { merged: number; repos: number; additions: number }): Promise<ImageResponse> {
  const fonts = await ogFonts()
  const items: [string, string][] = [
    [String(stats.merged), stats.merged === 1 ? 'PR MERGED' : 'PRS MERGED'],
    [String(stats.repos), stats.repos === 1 ? 'REPOSITORY' : 'REPOSITORIES'],
    [`+${stats.additions}`, 'LINES ADDED'],
  ]
  return new ImageResponse(
    ogShell([
      <div key="head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={GITHUB_SVG} width={80} height={80} alt="GitHub" />
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 26, color: TEAL, letterSpacing: 2 }}>
          <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 999, background: TEAL, marginRight: 14 }} />
          shahfahad.dev/open-source
        </div>
      </div>,

      <div key="headline" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 24, letterSpacing: 8, color: TEAL, marginBottom: 14 }}>SHAH FAHAD</div>
        <div style={{ display: 'flex', fontSize: 116, fontWeight: 800, lineHeight: 0.98 }}>OPEN SOURCE</div>
        <div style={{ display: 'flex', fontSize: 30, color: SUB, marginTop: 22 }}>
          Contributing to the tools I build with — starting with the Flutter framework.
        </div>
      </div>,

      <div key="stats" style={{ display: 'flex', gap: 26 }}>
        {items.map(([v, l]) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column', padding: '18px 30px', borderRadius: 18, background: 'rgba(94,234,212,0.06)', border: '2px solid rgba(94,234,212,0.28)' }}>
            <div style={{ display: 'flex', fontSize: 54, fontWeight: 800, color: TXT }}>{v}</div>
            <div style={{ display: 'flex', fontSize: 20, color: TEAL, letterSpacing: 3, marginTop: 6 }}>{l}</div>
          </div>
        ))}
      </div>,
    ]),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  )
}
