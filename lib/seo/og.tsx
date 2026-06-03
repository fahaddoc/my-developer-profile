// lib/seo/og.tsx
// Shared renderer for the dynamic OG / Twitter share image (1200×630),
// matching the "Split · photo right" concept: space backdrop + stars, name +
// role + skills + experience line on the left, sticker photo with a teal glow
// on the right. Used by app/opengraph-image.tsx and app/twitter-image.tsx.

import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

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

// Fetch a Google font as TTF (old UA forces ttf instead of woff2 so Satori can
// parse it). Returns null on any failure so the build never breaks on network.
async function loadInter(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko' },
    }).then((r) => r.text())
    const url = css.match(/src:\s*url\((https:\/\/[^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1]
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
