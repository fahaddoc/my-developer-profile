// lib/og/home.tsx
// Site-wide share image (app/opengraph-image.tsx): name, role, core stack and
// the sticker portrait on a titanium plate, the portrait backlit by a chrome
// halo so the black turtleneck separates from the matte plate.

import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'
import { AUTHOR } from '@/lib/seo/site'
import { OG_SIZE } from '@/lib/seo/og'
import { ogFonts } from './fonts'
import { C, COORDS, FONT, chrome } from './theme'
import { Data, Lamp, Plate, Title, brackets } from './plate'

const SKILLS = ['React', 'Next.js', 'TypeScript', 'Flutter']
const PHOTO_H = 570
const PHOTO_W = Math.round((PHOTO_H * 880) / 1168) // sticker is 880×1168
const COL_W = 480

function chip(label: string) {
  return (
    <div
      key={label}
      style={{
        display: 'flex',
        fontFamily: FONT.mono,
        fontWeight: 500,
        fontSize: 20,
        letterSpacing: 2,
        color: C.ink,
        padding: '10px 14px',
        borderRadius: 4,
        border: `1px solid ${chrome(0.3)}`,
        backgroundImage: `linear-gradient(180deg, ${chrome(0.09)}, ${chrome(0.02)})`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {label.toUpperCase()}
    </div>
  )
}

export async function renderOgImage(): Promise<ImageResponse> {
  const photo = readFileSync(join(process.cwd(), 'public/images/shah-fahad-sticker.png'))
  const photoSrc = `data:image/png;base64,${photo.toString('base64')}`
  const fonts = await ogFonts()
  const cx = COL_W / 2

  return new ImageResponse(
    (
      <Plate>
        {[
          /* left: identity */
          <div
            key="left"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, padding: '62px 0 60px 76px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Lamp />
              <Data color={C.chrome} track={4}>SHAHFAHAD.DEV</Data>
              <Data color={C.line} track={0}>//</Data>
              <Data track={2}>{COORDS}</Data>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Data size={22} track={8} color={C.ink2}>{AUTHOR.jobTitle.toUpperCase()}</Data>
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20 }}>
                <Title size={132}>Shah</Title>
                <Title size={132}>Fahad</Title>
              </div>
              <div style={{ display: 'flex', width: 96, height: 3, marginTop: 26, background: C.chrome, boxShadow: `0 0 14px ${chrome(0.5)}` }} />
              <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>{SKILLS.map(chip)}</div>
            </div>

            <Data size={20} track={3}>8+ YEARS · DIGITALHIRE · KARACHI, PK</Data>
          </div>,

          /* right: backlit portrait in a viewport */
          <div key="right" style={{ display: 'flex', position: 'relative', width: COL_W, height: '100%' }}>
            {[
              <div
                key="halo"
                style={{
                  position: 'absolute',
                  display: 'flex',
                  left: cx - 300,
                  top: 40,
                  width: 600,
                  height: 600,
                  backgroundImage: `radial-gradient(circle at 50% 50%, ${chrome(0.38)} 0%, ${chrome(0.13)} 36%, ${chrome(0)} 66%)`,
                }}
              />,
              <div
                key="ring-a"
                style={{ position: 'absolute', display: 'flex', left: cx - 190, top: 150, width: 380, height: 380, borderRadius: 999, border: `1px solid ${chrome(0.16)}` }}
              />,
              <div
                key="ring-b"
                style={{ position: 'absolute', display: 'flex', left: cx - 135, top: 205, width: 270, height: 270, borderRadius: 999, border: `1px dashed ${chrome(0.22)}` }}
              />,
              ...brackets('vp', { x: 40, y: 112, w: COL_W - 80, h: 450 }, 26, 2, chrome(0.7)),
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key="photo"
                src={photoSrc}
                width={PHOTO_W}
                height={PHOTO_H}
                alt=""
                style={{ position: 'absolute', left: cx - PHOTO_W / 2, bottom: 0, objectFit: 'contain' }}
              />,
            ]}
          </div>,
        ]}
      </Plate>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  )
}
